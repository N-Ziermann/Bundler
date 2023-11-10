import { singleton } from './singleton';
import { stuff } from './stuff';
import React from 'react';

singleton.printHello();
singleton.printStuff();
console.log(stuff.fruits.length);
console.log('react', React);
