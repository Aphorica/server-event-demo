# site-server-demo 

Demos per-user (browser) server-event action using the following
packages:

- [@aphorica/server-event-client](https://www.npmjs.com/package/@aphorica/server-event-client) - a client-side package to instantiate
  an _EventSource_ object and initiate and manage server-side events.

- [@aphorica/server-event-mgr](https://www.npmjs.com/package/@aphorica/server-event-mgr) - a server-side package to register, maintain,
  and invoke server-side notifications.

## Caveats
- _IN PROGRESS - STILL DEVELOPING!_.  The behavior described here
  is what _should_ be happening.  If not, well, I'm working on it.
- (pull requests welcome.)
- Read the _README.md_ files in each of the modules for more detailed 
  information on their use/implementation.

## To Set Up
This package will set up a client/server development environment.
The server environment is created with _docker-compose_ to avoid
having to set up a separate virtual machine or actual machine for
the server side.

There are a couple of pre-requisites to setting up the environment:
- Docker (https://docker.com) needs to be installed and running.
- _npm_ or _yarn_ needs to be installed and available at the command-line (I use _yarn_.)
- node needs to be run on the client side, since it is a _vuejs_ application.  See https://vuejs.org for more information.
- An IDE is useful - I'm using _vscode_ (https:visualstudio.com).

The `docker-compose up` command will build an _NGINX_ server environment
under _alpine_.  It will install and run _nodemon_ at port 9229, so you can connect to a debugger (under vscode, anyway.)

Since it is a development environment, you need to do the following
steps to get it up and running:

1. clone this repository.
2. cd into the ./site directory of your clone.
3. execute `npm install` or `yarn install` from the command line.
4. execute `npm serve` or `yarn serve` from the command line.
4. cd back to the demo root.
5. execute `docker-compose up` from the command line.
6. open a browser, type in a name and hit the _Submit!_ button.
7. the page will wait a few seconds and then you will see the
   response update.  Note your id and timestamp will be reflected
   in the _Registrants_ window.
8. You can re-submit, or hit the _Trigger Server Response_ button,
   which will force the server to initiate an immediate _ad hoc_
   response (reflected by count in the _Response_ header.)
9. Open more browsers and enter a different name in each, then hit
   the _Submit!_ and _Trigger Server Response_ buttons to see each
   client receives its own response.
10. Open another browser (or more) and enter the same name as one
    of the other browsers.  Note that the responses are refleted
    for all clients registered in that name.
11. Hit the _Stop Listening_ button to remove the user's connection.
    The list will update to show the user has been removed and the
    _State_ entry will show "Closed".

## Development
Because this is a client/server app, each referencing it's own npm-module, the development environment is a bit complex.  Here is how I manage it:

### Demo Application
Open an IDE in each of the directories _./site_ and _./app.  This will
make the application source available in the IDE.

- On the client side _(./site)_, this will be a _vuejs_ application.
- On the server side _(./app)_, this will be a _node express_ application.

Both are hot-served - if you make a change to the source in either
directory, they will update.  Unfortunately, this does not apply if you are changing source in either of the other modules.  See next.

### Modules
Clone each of the modules locally in separate directories.  You can either use the 'npm-link', 'yarn-link' or 'yalc' facilities to make them available in the _./site_ and _./app_ folders.

I personally like 'yalc', since the '*-link' facilities can be a bit flaky.

- Install yalc:
 - `npm install -g yalc`
 - `yarn global add yalc`

- cd into each of the module directories and type `yalc publish`.
- cd into the demo _./site_ directory and type `yalc add @aph/server-event-client`
- restart the server (ctrl-c if it's running and `npm serve` or `yarn serve`).
- cd into the demo _./app_ directory and type `yalc add @aph/server-event-mgr`
- restart the container from the demo root directory (`docker-compose down` and `docker-compose up`)

If you change source in either of the modules, you need to type `yalc update` in the module directory and then restart the applicable server, same as above.

If using _yalc_, when you're ready to commit, you need to clean the _yalc_ cruft out of any changed directories.  In each module directory, type `yalc remove`.

### Notes
It can be a bit difficult keeping everything straight.  I open an IDE in each of the _./site_ and _./app_ directories, as well as each of the module directories, with a terminal window in each, as well as a terminal window in the root demo directory.

A large monitor/multiple monitors helps.

