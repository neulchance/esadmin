/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {streamToBuffer} from 'td/base/common/buffer';
import {CancellationToken} from 'td/base/common/cancellation';
import {getErrorMessage} from 'td/base/common/errors';
import {Disposable} from 'td/base/common/lifecycle';
import {IHeaders, IRequestContext, IRequestOptions} from 'td/base/parts/request/common/request';
import {localize} from 'td/nls';
import {ConfigurationScope, Extensions, IConfigurationNode, IConfigurationRegistry} from 'td/platform/configuration/common/configurationRegistry';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {CONTEXT_LOG_LEVEL, ILogger, ILoggerService, LogLevel, LogLevelToString} from 'td/platform/log/common/log';
import {Registry} from 'td/platform/registry/common/platform';

export const IRequestService = createDecorator<IRequestService>('requestService');

export interface IRequestService {
	readonly _serviceBrand: undefined;

	request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext>;

	resolveProxy(url: string): Promise<string | undefined>;
	loadCertificates(): Promise<string[]>;
}

class LoggableHeaders {

	private headers: IHeaders | undefined;

	constructor(private readonly original: IHeaders) { }

	toJSON(): any {
		if (!this.headers) {
			const headers = Object.create(null);
			for (const key in this.original) {
				if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'proxy-authorization') {
					headers[key] = '*****';
				} else {
					headers[key] = this.original[key];
				}
			}
			this.headers = headers;
		}
		return this.headers;
	}

}

export abstract class AbstractRequestService extends Disposable implements IRequestService {

	declare readonly _serviceBrand: undefined;

	protected readonly logger: ILogger;
	private counter = 0;

	constructor(
		loggerService: ILoggerService
	) {
		super();
		this.logger = loggerService.createLogger('network', {
			name: localize('request', "Network Requests"),
			when: CONTEXT_LOG_LEVEL.isEqualTo(LogLevelToString(LogLevel.Trace)).serialize()
		});
	}

	protected async logAndRequest(stack: string, options: IRequestOptions, request: () => Promise<IRequestContext>): Promise<IRequestContext> {
		const prefix = `${stack} #${++this.counter}: ${options.url}`;
		this.logger.trace(`${prefix} - begin`, options.type, new LoggableHeaders(options.headers ?? {}));
		try {
			const result = await request();
			this.logger.trace(`${prefix} - end`, options.type, result.res.statusCode, result.res.headers);
			return result;
		} catch (error) {
			this.logger.error(`${prefix} - error`, options.type, getErrorMessage(error));
			throw error;
		}
	}

	abstract request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext>;
	abstract resolveProxy(url: string): Promise<string | undefined>;
	abstract loadCertificates(): Promise<string[]>;
}

export function isSuccess(context: IRequestContext): boolean {
	return (context.res.statusCode && context.res.statusCode >= 200 && context.res.statusCode < 300) || context.res.statusCode === 1223;
}

export function hasNoContent(context: IRequestContext): boolean {
	return context.res.statusCode === 204;
}

export async function asText(context: IRequestContext): Promise<string | null> {
	if (hasNoContent(context)) {
		return null;
	}
	const buffer = await streamToBuffer(context.stream);
	return buffer.toString();
}

export async function asTextOrError(context: IRequestContext): Promise<string | null> {
	if (!isSuccess(context)) {
		throw new Error('Server returned ' + context.res.statusCode);
	}
	return asText(context);
}

export async function asJson<T = {}>(context: IRequestContext): Promise<T | null> {
	if (!isSuccess(context)) {
		throw new Error('Server returned ' + context.res.statusCode);
	}
	if (hasNoContent(context)) {
		return null;
	}
	const buffer = await streamToBuffer(context.stream);
	const str = buffer.toString();
	try {
		return JSON.parse(str);
	} catch (err) {
		err.message += ':\n' + str;
		throw err;
	}
}

export function updateProxyConfigurationsScope(scope: ConfigurationScope): void {
	registerProxyConfigurations(scope);
}

let proxyConfiguration: IConfigurationNode | undefined;
function registerProxyConfigurations(scope: ConfigurationScope): void {
	const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
	const oldProxyConfiguration = proxyConfiguration;
	proxyConfiguration = {
		id: 'http',
		order: 15,
		title: localize('httpConfigurationTitle', "HTTP"),
		type: 'object',
		scope,
		properties: {
			'http.proxy': {
				type: 'string',
				pattern: '^(https?|socks|socks4a?|socks5h?)://([^:]*(:[^@]*)?@)?([^:]+|\\[[:0-9a-fA-F]+\\])(:\\d+)?/?$|^$',
				markdownDescription: localize('proxy', "The proxy setting to use. If not set, will be inherited from the `http_proxy` and `https_proxy` environment variables."),
				restricted: true
			},
			'http.proxyStrictSSL': {
				type: 'boolean',
				default: true,
				description: localize('strictSSL', "Controls whether the proxy server certificate should be verified against the list of supplied CAs."),
				restricted: true
			},
			'http.proxyKerberosServicePrincipal': {
				type: 'string',
				markdownDescription: localize('proxyKerberosServicePrincipal', "Overrides the principal service name for Kerberos authentication with the HTTP proxy. A default based on the proxy hostname is used when this is not set."),
				restricted: true
			},
			'http.proxyAuthorization': {
				type: ['null', 'string'],
				default: null,
				markdownDescription: localize('proxyAuthorization', "The value to send as the `Proxy-Authorization` header for every network request."),
				restricted: true
			},
			'http.proxySupport': {
				type: 'string',
				enum: ['off', 'on', 'fallback', 'override'],
				enumDescriptions: [
					localize('proxySupportOff', "Disable proxy support for extensions."),
					localize('proxySupportOn', "Enable proxy support for extensions."),
					localize('proxySupportFallback', "Enable proxy support for extensions, fall back to request options, when no proxy found."),
					localize('proxySupportOverride', "Enable proxy support for extensions, override request options."),
				],
				default: 'override',
				description: localize('proxySupport', "Use the proxy support for extensions."),
				restricted: true
			},
			'http.systemCertificates': {
				type: 'boolean',
				default: true,
				description: localize('systemCertificates', "Controls whether CA certificates should be loaded from the OS. (On Windows and macOS, a reload of the window is required after turning this off.)"),
				restricted: true
			},
			'http.experimental.systemCertificatesV2': {
				type: 'boolean',
				tags: ['experimental'],
				default: false,
				description: localize('systemCertificatesV2', "Controls whether experimental loading of CA certificates from the OS should be enabled. This uses a more general approach than the default implemenation."),
				restricted: true
			}
		}
	};
	configurationRegistry.updateConfigurations({add: [proxyConfiguration], remove: oldProxyConfiguration ? [oldProxyConfiguration] : []});
}

registerProxyConfigurations(ConfigurationScope.APPLICATION);
