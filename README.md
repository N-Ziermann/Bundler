# Bundler

[![npm](https://img.shields.io/npm/dt/%40ziermann/bundler?logo=npm&label&color=333&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40ziermann%2Fbundler)](https://www.npmjs.com/package/@ziermann/bundler)
[![Example](https://img.shields.io/badge/Example_Project-%23333?logo=React)](https://bundler.n-ziermann.com/)

This is a personal project I built to better understand how bundlers work.

It uses babel to transpile code to CommonJS and bundles that code into a singular JavaScript file.

These are some of the features it supports:

- reading node_modules (even in pnpm workspaces)
- transpiling esmodules & typescript using babel
- loading assets like pngs and css files using a loader-pattern
- reading a local config file (bundler.json)
- using a public folder that gets merged into the output
- multithreading for transpilation (using workers)

In combination all of these features offer enough functionality to bundle a fully working react site.

Note that this bundler is _not_ meant to be especially fast.
It is specifically written to _not_ use any libraries that abstract away behaviours commonly connected to bundling, like:

- file reading
- file combination
- getting dependencies of a file
- multithreading

If you would like to try it out anyway then you can use this command to try it out.

`npx @ziermann/bundler`

A working bundler.json config for react projects can be found in the examples directory.

And the bundled result of that example can be found [here](https://bundler.n-ziermann.com/)
