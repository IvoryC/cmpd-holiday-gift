// @flow

var config = require('../../config');
var auth = require('../lib/auth');
var db = require('../../models');
var registration = require('../lib/registration');
var { rootUrl } = require('../lib/misc');

import type { Request, AuthRequest, Response } from '../lib/typed-express';
import type { AppName, UserType } from '../lib/auth';

type RegisterRequest = {|
  firstname: string,
  lastname: string,
  rank: string,
  phone: string,
  affiliation: number,
  email: string,
  password: string
|};
async function register(req: Request<>, res: Response): Promise<void> {
  var body: RegisterRequest = (req.body: any);
  var error = await registration.steps.register(rootUrl(req), {
    name_first: body.firstname,
    name_last: body.lastname,
    rank: body.rank,
    phone: body.phone,
    affiliation_id: body.affiliation,
    email: body.email,
    raw_password: body.password
  });
  if (error) {
    res.json(error);
  } else {
    res.json({ success: true });
  }
}

type LoginRequest = {|
  email: string,
  password: string
|};
async function login(req: Request<>, res: Response): Promise<void> {
  const body: LoginRequest = (req.body: any);
  var user = await db.user.findOne({ where: { email: body.email } });
  if (user && auth.validHashOfPassword(user.password, body.password)) {
    // TODO handle errors from create
    var session = await db.session.create({ user_id: user.id });
    res.json({ token: auth.makeToken({ session_id: session.id }, config.jwtSecrets.auth, config.authTokenLifetime) });
  } else {
    // Unknown username or invalid password
    res.json({ failed: true });
  }
}

async function extend(req: AuthRequest<UserType>, res: Response): Promise<void> {
  // TODO: extend existing session instead of creating new one
  var session = await db.session.create({ user_id: req.user.id });
  res.json({ token: auth.makeToken({ session_id: session.id }, config.jwtSecrets.auth, config.authTokenLifetime) });
}

type AccessRequest = {|
  app: AppName
|};
async function getToken(req: AuthRequest<UserType>, res: $Response): Promise<void> {
  const body: AccessRequest = (req.body: any);
  if (req.user && auth.userCanUseApp(req.user, body.app)) {
    res.json({ token: auth.makeToken({ id: req.user.id }, config.jwtSecrets[body.app], config.appTokenLifetime) });
  } else {
    res.status(403).send();
  }
}

type ConfirmRequest = {|
  id: number,
  confirmation_code: string
|};
async function confirm(req: Request<>, res: Response): Promise<void> {
  const body: ConfirmRequest = (req.body: any);
  var error = await registration.steps.confirmEmail(rootUrl(req), {
    user_id: body.id,
    confirmation_code: body.confirmation_code
  });
  if (error) {
    res.json(error);
  } else {
    res.json({ success: true });
  }
}

type ApproveRequest = {|
  user_id: number
|};
async function approve(req: AuthRequest<UserType & {admin: true}>, res: Response): Promise<void> {
  const body: ApproveRequest = (req.body: any);
  var error = await registration.steps.approve(body.user_id);
  if (error) {
    res.json(error);
  } else {
    res.json({ success: true });
  }
}

module.exports = {
  login,
  register,
  getToken,
  confirm,
  extend,
  approve
};