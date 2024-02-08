/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {Registry} from 'td/platform/registry/common/platform';
import {MenuRegistry, MenuId, registerAction2} from 'td/platform/actions/common/actions';
import {IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions, IWorkbenchContribution} from 'td/workbench/common/contributions';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';
import {CommandsRegistry} from 'td/platform/commands/common/commands';
import {ServicesAccessor, IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {EditorPaneDescriptor, IEditorPaneRegistry} from 'td/workbench/browser/editor';
import {LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';
import {RuntimeExtensionsEditor, StartExtensionHostProfileAction, StopExtensionHostProfileAction, CONTEXT_PROFILE_SESSION_STATE, CONTEXT_EXTENSION_HOST_PROFILE_RECORDED, SaveExtensionHostProfileAction, IExtensionHostProfileService} from 'td/workbench/contrib/extensions/electron-sandbox/runtimeExtensionsEditor';
import {DebugExtensionHostAction} from 'td/workbench/contrib/extensions/electron-sandbox/debugExtensionHostAction';
import {IEditorSerializer, IEditorFactoryRegistry, EditorExtensions} from 'td/workbench/common/editor';
import {ActiveEditorContext} from 'td/workbench/common/contextkeys';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {RuntimeExtensionsInput} from 'td/workbench/contrib/extensions/common/runtimeExtensionsInput';
import {ContextKeyExpr} from 'td/platform/contextkey/common/contextkey';
import {CleanUpExtensionsFolderAction, OpenExtensionsFolderAction} from 'td/workbench/contrib/extensions/electron-sandbox/extensionsActions';
import {IExtensionRecommendationNotificationService} from 'td/platform/extensionRecommendations/common/extensionRecommendations';
import {ISharedProcessService} from 'td/platform/ipc/electron-sandbox/services';
import {ExtensionRecommendationNotificationServiceChannel} from 'td/platform/extensionRecommendations/common/extensionRecommendationsIpc';
import {Codicon} from 'td/base/common/codicons';
import {RemoteExtensionsInitializerContribution} from 'td/workbench/contrib/extensions/electron-sandbox/remoteExtensionsInit';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ExtensionHostProfileService} from 'td/workbench/contrib/extensions/electron-sandbox/extensionProfileService';
import {ExtensionsAutoProfiler} from 'td/workbench/contrib/extensions/electron-sandbox/extensionsAutoProfiler';

// Singletons
registerSingleton(IExtensionHostProfileService, ExtensionHostProfileService, InstantiationType.Delayed);

// Running Extensions Editor
Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(RuntimeExtensionsEditor, RuntimeExtensionsEditor.ID, localize('runtimeExtension', "Running Extensions")),
	[new SyncDescriptor(RuntimeExtensionsInput)]
);

class RuntimeExtensionsInputSerializer implements IEditorSerializer {
	canSerialize(editorInput: EditorInput): boolean {
		return true;
	}
	serialize(editorInput: EditorInput): string {
		return '';
	}
	deserialize(instantiationService: IInstantiationService): EditorInput {
		return RuntimeExtensionsInput.instance;
	}
}

Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(RuntimeExtensionsInput.ID, RuntimeExtensionsInputSerializer);


// Global actions

class ExtensionsContributions implements IWorkbenchContribution {

	constructor(
		@IExtensionRecommendationNotificationService extensionRecommendationNotificationService: IExtensionRecommendationNotificationService,
		@ISharedProcessService sharedProcessService: ISharedProcessService,
	) {
		sharedProcessService.registerChannel('extensionRecommendationNotification', new ExtensionRecommendationNotificationServiceChannel(extensionRecommendationNotificationService));
		registerAction2(OpenExtensionsFolderAction);
		registerAction2(CleanUpExtensionsFolderAction);
	}
}

const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionsContributions, LifecyclePhase.Restored);
workbenchRegistry.registerWorkbenchContribution(ExtensionsAutoProfiler, LifecyclePhase.Eventually);
workbenchRegistry.registerWorkbenchContribution(RemoteExtensionsInitializerContribution, LifecyclePhase.Restored);
// Register Commands

CommandsRegistry.registerCommand(DebugExtensionHostAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(DebugExtensionHostAction).run();
});

CommandsRegistry.registerCommand(StartExtensionHostProfileAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(StartExtensionHostProfileAction, StartExtensionHostProfileAction.ID, StartExtensionHostProfileAction.LABEL).run();
});

CommandsRegistry.registerCommand(StopExtensionHostProfileAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(StopExtensionHostProfileAction, StopExtensionHostProfileAction.ID, StopExtensionHostProfileAction.LABEL).run();
});

CommandsRegistry.registerCommand(SaveExtensionHostProfileAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(SaveExtensionHostProfileAction, SaveExtensionHostProfileAction.ID, SaveExtensionHostProfileAction.LABEL).run();
});

// Running extensions

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: DebugExtensionHostAction.ID,
		title: DebugExtensionHostAction.LABEL,
		icon: Codicon.debugStart
	},
	group: 'navigation',
	when: ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID)
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: StartExtensionHostProfileAction.ID,
		title: StartExtensionHostProfileAction.LABEL,
		icon: Codicon.circleFilled
	},
	group: 'navigation',
	when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.notEqualsTo('running'))
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: StopExtensionHostProfileAction.ID,
		title: StopExtensionHostProfileAction.LABEL,
		icon: Codicon.debugStop
	},
	group: 'navigation',
	when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.isEqualTo('running'))
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: SaveExtensionHostProfileAction.ID,
		title: SaveExtensionHostProfileAction.LABEL,
		icon: Codicon.saveAll,
		precondition: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED
	},
	group: 'navigation',
	when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID))
});
