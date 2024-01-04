import {INativeWindowConfiguration} from "td/platform/window/common/window";

export class DesktopMain {
  
  constructor(
		private readonly configuration?: INativeWindowConfiguration
	) {
	}

  async open(): Promise<void> {
    console.log('open')
  }
}

export function main() {
  const workbench = new DesktopMain();
  workbench.open();
}