export class DesktopMain {
  async open(): Promise<void> {
    console.log('open')
  }
}

export function main() {
  const workbench = new DesktopMain();
  workbench.open();
}