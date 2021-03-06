// @flow

const {
  login, register, getToken, confirm, extend, approve,
  sendRecoverEmail, verifyConfirmationCode, resetPassword
} = require('./controllers');
const auth = require('../lib/auth');
const { Router } = require('../lib/typed-express');
const { ensureLoggedIn, ensureAdmin } = require('../lib/auth');

import type { UserType } from '../lib/auth';
import type { AuthRequest } from '../lib/typed-express';

const router: Router<AuthRequest<?UserType>> = new Router();

router.post('/login').handleAsync(login);
router.post('/register').handleAsync(register);
router.post('/access').use(ensureLoggedIn).handleAsync(getToken);
router.post('/confirm_email').handleAsync(confirm);
router.post('/extend').use(ensureLoggedIn).handleAsync(extend);
router.post('/approve').use(ensureAdmin).handleAsync(approve);
router.post('/recover/send_email').handleAsync(sendRecoverEmail);
// router.post('/recover/verify').handleAsync(verifyConfirmationCode); // Not implemented. See auth/controllers
// router.post('/reset_password').use(auth.ensureLoggedIn).handleAsync(resetPassword); // Not implemented. See auth/controllers
router.post('/recover/reset_password').handleAsync(resetPassword);

module.exports = router;
