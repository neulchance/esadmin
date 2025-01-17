/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IAccessibilityService, AccessibilitySupport} from 'td/platform/accessibility/common/accessibility';
import {isWindows, isLinux} from 'td/base/common/platform';
import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {AccessibilityService} from 'td/platform/accessibility/browser/accessibilityService';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {IJSONEditingService} from 'td/workbench/services/configuration/common/jsonEditing';
import {IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2} from 'td/workbench/common/contributions';
import {INativeHostService} from 'td/platform/native/common/native';
import {ILayoutService} from 'td/platform/layout/browser/layoutService';

interface AccessibilityMetrics {
	enabled: boolean;
}
type AccessibilityMetricsClassification = {
	owner: 'isidorn';
	comment: 'Helps gain an understanding of when accessibility features are being used';
	enabled: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether or not accessibility features are enabled' };
};

export class NativeAccessibilityService extends AccessibilityService implements IAccessibilityService {

	private didSendTelemetry = false;
	private shouldAlwaysUnderlineAccessKeys: boolean | undefined = undefined;

	constructor(
		@INativeWorkbenchEnvironmentService environmentService: INativeWorkbenchEnvironmentService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurationService configurationService: IConfigurationService,
		@ILayoutService _layoutService: ILayoutService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(contextKeyService, _layoutService, configurationService);
		this.setAccessibilitySupport(environmentService.window.accessibilitySupport ? AccessibilitySupport.Enabled : AccessibilitySupport.Disabled);
	}

	override async alwaysUnderlineAccessKeys(): Promise<boolean> {
		if (!isWindows) {
			return false;
		}

		if (typeof this.shouldAlwaysUnderlineAccessKeys !== 'boolean') {
			const windowsKeyboardAccessibility = await this.nativeHostService.windowsGetStringRegKey('HKEY_CURRENT_USER', 'Control Panel\\Accessibility\\Keyboard Preference', 'On');
			this.shouldAlwaysUnderlineAccessKeys = (windowsKeyboardAccessibility === '1');
		}

		return this.shouldAlwaysUnderlineAccessKeys;
	}

	override setAccessibilitySupport(accessibilitySupport: AccessibilitySupport): void {
		super.setAccessibilitySupport(accessibilitySupport);

		if (!this.didSendTelemetry && accessibilitySupport === AccessibilitySupport.Enabled) {
			this._telemetryService.publicLog2<AccessibilityMetrics, AccessibilityMetricsClassification>('accessibility', {enabled: true});
			this.didSendTelemetry = true;
		}
	}
}

registerSingleton(IAccessibilityService, NativeAccessibilityService, InstantiationType.Delayed);

// On linux we do not automatically detect that a screen reader is detected, thus we have to implicitly notify the renderer to enable accessibility when user configures it in settings
class LinuxAccessibilityContribution implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.linuxAccessibility';

	constructor(
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@IAccessibilityService accessibilityService: IAccessibilityService,
		@INativeWorkbenchEnvironmentService environmentService: INativeWorkbenchEnvironmentService
	) {
		const forceRendererAccessibility = () => {
			if (accessibilityService.isScreenReaderOptimized()) {
				jsonEditingService.write(environmentService.argvResource, [{path: ['force-renderer-accessibility'], value: true}], true);
			}
		};
		forceRendererAccessibility();
		accessibilityService.onDidChangeScreenReaderOptimized(forceRendererAccessibility);
	}
}

if (isLinux) {
	registerWorkbenchContribution2(LinuxAccessibilityContribution.ID, LinuxAccessibilityContribution, WorkbenchPhase.BlockRestore);
}
