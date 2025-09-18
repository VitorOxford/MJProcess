/**
 * plugins/vuetify.ts
 */

import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

// Importa o nosso novo adaptador LOCAL e COMPLETO
import { dateAdapter } from './date-adapter'

export default createVuetify({
  date: {
    adapter: dateAdapter,
  },
  theme: {
    defaultTheme: 'dark',
  },
})
