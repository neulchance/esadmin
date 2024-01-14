/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { KeyCode } from 'td/base/common/keyCodes';
import { DisposableStore } from 'td/base/common/lifecycle';
import { ensureNoDisposablesAreLeakedInTestSuite } from 'td/base/test/common/utils';
import { StandaloneCodeEditorService } from 'td/editor/standalone/browser/standaloneCodeEditorService';
import { StandaloneCommandService, StandaloneConfigurationService, StandaloneKeybindingService, StandaloneNotificationService } from 'td/editor/standalone/browser/standaloneServices';
import { StandaloneThemeService } from 'td/editor/standalone/browser/standaloneThemeService';
import { ContextKeyService } from 'td/platform/contextkey/browser/contextKeyService';
import { InstantiationService } from 'td/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'td/platform/instantiation/common/serviceCollection';
import { IKeyboardEvent } from 'td/platform/keybinding/common/keybinding';
import { NullLogService } from 'td/platform/log/common/log';
import { NullTelemetryService } from 'td/platform/telemetry/common/telemetryUtils';

suite('StandaloneKeybindingService', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	class TestStandaloneKeybindingService extends StandaloneKeybindingService {
		public testDispatch(e: IKeyboardEvent): void {
			super._dispatch(e, null!);
		}
	}

	test('issue microsoft/monaco-editor#167', () => {

		const disposables = new DisposableStore();
		const serviceCollection = new ServiceCollection();
		const instantiationService = new InstantiationService(serviceCollection, true);
		const configurationService = new StandaloneConfigurationService();
		const contextKeyService = disposables.add(new ContextKeyService(configurationService));
		const commandService = new StandaloneCommandService(instantiationService);
		const notificationService = new StandaloneNotificationService();
		const standaloneThemeService = disposables.add(new StandaloneThemeService());
		const codeEditorService = disposables.add(new StandaloneCodeEditorService(contextKeyService, standaloneThemeService));
		const keybindingService = disposables.add(new TestStandaloneKeybindingService(contextKeyService, commandService, NullTelemetryService, notificationService, new NullLogService(), codeEditorService));

		let commandInvoked = false;
		disposables.add(keybindingService.addDynamicKeybinding('testCommand', KeyCode.F9, () => {
			commandInvoked = true;
		}, undefined));

		keybindingService.testDispatch({
			_standardKeyboardEventBrand: true,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			altGraphKey: false,
			keyCode: KeyCode.F9,
			code: null!
		});

		assert.ok(commandInvoked, 'command invoked');

		disposables.dispose();
	});
});
