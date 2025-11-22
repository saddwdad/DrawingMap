import { createApp, h } from 'vue'
import App from './App.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faEraser, faPalette } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'
import antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css';

library.add(faEraser, faPalette)
const app = createApp(App)



app.component('FontAwesomeIcon', FontAwesomeIcon)

app.use(antd)




app.mount('#app')


