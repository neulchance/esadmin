/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {app, dialog} from 'electron'
import {unlinkSync} from 'fs'
import {DevApplication} from 'td/dev/electron-main/app'
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection'
import {InstantiationService} from 'td/platform/instantiation/common/instantiationService'
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation'
import {ProtocolMainService} from 'td/platform/protocol/electron-main/protocolMainService'
import {IProtocolMainService} from 'td/platform/protocol/electron-main/protocol'
import {EnvironmentMainService} from 'td/platform/environment/electron-main/environmentMainService'
import {NativeParsedArgs} from 'td/platform/environment/common/argv'
import {cwd} from 'td/base/common/process'
import {IPathWithLineAndColumn, isValidBasename, parseLineAndColumnAware, sanitizeFilePath} from 'td/base/common/extpath'
import {isMacintosh, isWindows} from 'td/base/common/platform'
import {rtrim, trim} from 'td/base/common/strings'
import {coalesce, distinct} from 'td/base/common/arrays'
import {basename, resolve} from 'td/base/common/path'
import {addArg, parseMainProcessArgv} from 'td/platform/environment/node/argvHelper'
import {createWaitMarkerFileSync} from 'td/platform/environment/node/wait'
import {IProductService} from 'td/platform/product/common/productService'
import product from 'td/platform/product/common/product'
import {IUserDataProfilesMainService, UserDataProfilesMainService} from 'td/platform/userDataProfile/electron-main/userDataProfile'
import {SaveStrategy, StateService} from 'td/platform/state/node/stateService'
import {ILoggerMainService, LoggerMainService} from 'td/platform/log/electron-main/loggerService'
import {ConsoleMainLogger, ILogService, getLogLevel} from 'td/platform/log/common/log'
import {BufferLogger} from 'td/platform/log/common/bufferLog'
import {LogService} from 'td/platform/log/common/logService'
import {DisposableStore} from 'td/base/common/lifecycle'
import {FileService} from 'td/platform/files/common/fileService'
import {IFileService} from 'td/platform/files/common/files'
import {DiskFileSystemProvider} from 'td/platform/files/node/diskFileSystemProvider'
import {Schemas} from 'td/base/common/network'
import {IStateReadService, IStateService} from 'td/platform/state/node/state'
import {UriIdentityService} from 'td/platform/uriIdentity/common/uriIdentityService'
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity'

/**
 * The main TD Dev entry point.
 *
 * Note: This class can exist more than once for example when VS Code is already
 * running and a second instance is started from the command line. It will always
 * try to communicate with an existing instance to prevent that 2 VS Code instances
 * are running at the same time.
 */
class DevMain {
  
  main(): void {
		try {
			this.startup()
		} catch (error) {
			console.error(error.message)
			app.exit(1)
		}
	}

  private async startup(): Promise<void> {

    // Create services
    const [instantiationService] = this.createService()

    try {

      try {
        // 
      } catch (error) {
        // 
      }

      // Startup
      await instantiationService.invokeFunction(async accessor => {
        // accessor.get()
        
        return instantiationService.createInstance(DevApplication).startup()
      })
    } catch (error) {
      // instantiationService.invokeFunction(this.quit, error)
    }
  }

  private createService(): [IInstantiationService] {
    const services = new ServiceCollection()
    const disposables = new DisposableStore()

    // Product
		const productService = {_serviceBrand: undefined, ...product};
		services.set(IProductService, productService);

    // Environment
		const environmentMainService = new EnvironmentMainService(this.resolveArgs(), productService);

    // Logger
		const loggerService = new LoggerMainService(getLogLevel(environmentMainService), environmentMainService.logsHome);
		services.set(ILoggerMainService, loggerService);

    // Log: We need to buffer the spdlog logs until we are sure
		// we are the only instance running, otherwise we'll have concurrent
		// log file access on Windows (https://github.com/microsoft/vscode/issues/41218)
		const bufferLogger = new BufferLogger(loggerService.getLogLevel());
		const logService = disposables.add(new LogService(bufferLogger, [new ConsoleMainLogger(loggerService.getLogLevel())]));
		services.set(ILogService, logService);

    // Files
		const fileService = new FileService(logService);
		services.set(IFileService, fileService);
		const diskFileSystemProvider = new DiskFileSystemProvider(logService);
		fileService.registerProvider(Schemas.file, diskFileSystemProvider);

    // URI Identity
		const uriIdentityService = new UriIdentityService(fileService);
		services.set(IUriIdentityService, uriIdentityService);

    // State
		const stateService = new StateService(SaveStrategy.DELAYED, environmentMainService, logService, fileService);
		services.set(IStateReadService, stateService);
		services.set(IStateService, stateService);

    // User Data Profiles
		const userDataProfilesMainService = new UserDataProfilesMainService(stateService, uriIdentityService, environmentMainService, fileService, logService);
		services.set(IUserDataProfilesMainService, userDataProfilesMainService);

    // Protocol (instantiated early and not using sync descriptor for security reasons)
    services.set(IProtocolMainService, new ProtocolMainService(environmentMainService, userDataProfilesMainService, logService));

    return [new InstantiationService(services, true)]
  }

  //#region Command line arguments utilities

	private resolveArgs(): NativeParsedArgs {

		// Parse arguments
		const args = this.validatePaths(parseMainProcessArgv(process.argv));

		// If we are started with --wait create a random temporary file
		// and pass it over to the starting instance. We can use this file
		// to wait for it to be deleted to monitor that the edited file
		// is closed and then exit the waiting process.
		//
		// Note: we are not doing this if the wait marker has been already
		// added as argument. This can happen if VS Code was started from CLI.

		if (args.wait && !args.waitMarkerFilePath) {
			const waitMarkerFilePath = createWaitMarkerFileSync(args.verbose);
			if (waitMarkerFilePath) {
				addArg(process.argv, '--waitMarkerFilePath', waitMarkerFilePath);
				args.waitMarkerFilePath = waitMarkerFilePath;
			}
		}

		return args;
	}

  private validatePaths(args: NativeParsedArgs): NativeParsedArgs {

		// Track URLs if they're going to be used
		if (args['open-url']) {
			args._urls = args._;
			args._ = [];
		}

		// Normalize paths and watch out for goto line mode
		if (!args['remote']) {
			const paths = this.doValidatePaths(args._, args.goto);
			args._ = paths;
		}

		return args;
	}

  private doValidatePaths(args: string[], gotoLineMode?: boolean): string[] {
		const currentWorkingDir = cwd();
		const result = args.map(arg => {
			let pathCandidate = String(arg);

			let parsedPath: IPathWithLineAndColumn | undefined = undefined;
			if (gotoLineMode) {
				parsedPath = parseLineAndColumnAware(pathCandidate);
				pathCandidate = parsedPath.path;
			}

			if (pathCandidate) {
				pathCandidate = this.preparePath(currentWorkingDir, pathCandidate);
			}

			const sanitizedFilePath = sanitizeFilePath(pathCandidate, currentWorkingDir);

			const filePathBasename = basename(sanitizedFilePath);
			if (filePathBasename /* can be empty if code is opened on root */ && !isValidBasename(filePathBasename)) {
				return null; // do not allow invalid file names
			}

			if (gotoLineMode && parsedPath) {
				parsedPath.path = sanitizedFilePath;

				return this.toPath(parsedPath);
			}

			return sanitizedFilePath;
		});

		const caseInsensitive = isWindows || isMacintosh;
		const distinctPaths = distinct(result, path => path && caseInsensitive ? path.toLowerCase() : (path || ''));

		return coalesce(distinctPaths);
	}

  private preparePath(cwd: string, path: string): string {

		// Trim trailing quotes
		if (isWindows) {
			path = rtrim(path, '"'); // https://github.com/microsoft/vscode/issues/1498
		}

		// Trim whitespaces
		path = trim(trim(path, ' '), '\t');

		if (isWindows) {

			// Resolve the path against cwd if it is relative
			path = resolve(cwd, path);

			// Trim trailing '.' chars on Windows to prevent invalid file names
			path = rtrim(path, '.');
		}

		return path;
	}

  private toPath(pathWithLineAndCol: IPathWithLineAndColumn): string {
		const segments = [pathWithLineAndCol.path];

		if (typeof pathWithLineAndCol.line === 'number') {
			segments.push(String(pathWithLineAndCol.line));
		}

		if (typeof pathWithLineAndCol.column === 'number') {
			segments.push(String(pathWithLineAndCol.column));
		}

		return segments.join(':');
	}

}

// Main Startup
const dev = new DevMain()
dev.main()
