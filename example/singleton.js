const { stuff } = require('./stuff');

class Singleton {
  printHello() {
    console.log('Hello');
  }

  printStuff() {
    console.log(JSON.stringify(stuff));
  }
}

module.exports = { singleton: new Singleton() };
