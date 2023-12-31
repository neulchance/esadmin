/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../typings/require.d.ts" />

const information = document.getElementById('info')
information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`

const func = async () => {
  const response = await versions.ping()
  console.log(response) // prints out 'pong'
}

func();