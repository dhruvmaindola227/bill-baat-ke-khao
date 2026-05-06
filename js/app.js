import AppService from './AppService.js';
import { Router } from './utils/Router.js';
import Modal from './utils/Modal.js';
import { HomeView } from './views/HomeView.js';
import { GroupView } from './views/GroupView.js';

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function init() {
  AppService.init();
  Modal.init();

  const router = new Router();
  const homeView = new HomeView(AppService, router);
  const groupView = new GroupView(AppService, router);

  router
    .on('/', () => {
      homeView.render();
      showView('view-home');
    })
    .on('/group/:id', ({ id }) => {
      groupView.render(id, 'expenses');
      showView('view-group');
    })
    .on('/group/:id/settle', ({ id }) => {
      groupView.render(id, 'settle');
      showView('view-group');
    })
    .on('/group/:id/summary', ({ id }) => {
      groupView.render(id, 'summary');
      showView('view-group');
    })
    .start();
}

init();
