import { createRouter, createWebHashHistory } from 'vue-router'
import SetupView from './views/SetupView.vue'
import TimerView from './views/TimerView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/setup' },
    { path: '/setup', component: SetupView },
    { path: '/timer', component: TimerView },
  ],
})
