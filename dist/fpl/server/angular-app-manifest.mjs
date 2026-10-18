
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/home",
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/home"
  },
  {
    "renderMode": 0,
    "route": "/manager/*"
  },
  {
    "renderMode": 2,
    "route": "/login"
  },
  {
    "renderMode": 2,
    "redirectTo": "/home",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 5034, hash: '3da6e6894201720ec10b343a9b9f921793e48a5e43ef5b0be6c3f168e8bc1f2b', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 941, hash: '043b0be17fae44a6a2ececfb8d1755b41005009d433b3896afab8eef60602521', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'home/index.html': {size: 240, hash: 'db096474d521163c4f5fb7d700305222bcea1012b38583442ad232da75e59192', text: () => import('./assets-chunks/home_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 17806, hash: 'dc0cd13759f1360dafc0db0f05a60c2a3f3b2fd8bb265927085e382eff0023e4', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'styles-GUTWGIOA.css': {size: 10521, hash: 'c3rMKPekxBY', text: () => import('./assets-chunks/styles-GUTWGIOA_css.mjs').then(m => m.default)}
  },
};
