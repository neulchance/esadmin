import { task } from 'hereby';
import fs from "fs";
import path from "path";
import {
  createCompiler
} from "./scripts/build/compilation.mjs";

export const hello = task({
  name: "hello",
  description: "Builds the full compiler and services",
  run: async () => {
    console.log('hereby hello!')
    createCompiler()
  }
});

export default hello;

/* export const watchSrc = task({
  name: "watch-src",
  description: "Watches the src project (all code)",
  hiddenFromTaskList: true,
  dependencies: [generateDiagnostics],
  run: () => watchProject("src"),
}); */