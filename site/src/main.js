import Vue from 'vue';
import App from './App.vue';

//
// Following is for IE (11+).
//
// Note you have to also install 'promise-polyfill' and
// 'babel-regenerator-runtime' for IE to work.
//
import 'promise-polyfill';

new Vue({
  render: h => h(App),
}).$mount('#app');
