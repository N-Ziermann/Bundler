const { singleton } = require('./singleton');
const { stuff } = require('./stuff');

singleton.printHello();
singleton.printStuff();
console.log(stuff.fruits.length);
