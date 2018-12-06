#site-server-demo 

Demo per-user (browser) server-event action.

Open a bunch of browsers, type in a different name in each.
Notifications should only come to that name.

(If you open multiple browsers with the same name, each should
receive the notification for that name)

Notes:

 - for development, simply run 'docker-compose up'.  It will:
   <dl>
   <dt>Server Container:</dt>
   <dd> Install nodemon, do a 'yarn install' and start things with
        'nodemon index.js'.  For live debugging/editing, just open code in
        app.
   </dd>
   <dt>Site Container:</dt>
   <dd> Start NGINX</dd>
   <dt>Both Containers:</dt>
   <dd>
     Make the source directories available to the containers for
     direct modification.
   </dl>

 - for production, run 'docker-compose -f docker-compose.prod.yml up --build'
   This will ignore the default 'docker-compose.yml'.  It will
   copy the 'app' directory into the container, do a 'yarn install' and
   start up with 'node index.js'.  
      
   NOTE: the production configuration is not complete as of this writing.

 - in between switching build types, you need to delete the created image -
   stuff hangs around between builds.
 
 - This example tests a simple implementation of ServerEvents, something
   I'm investigating at the moment.  To demo:

   - Open a browser window to localhost:8080.  This will render a title
     and two buttons for voting.

   - Open one or more other browser windows to localhost:8080/results.
     This will render a results page with the number of yes/no votes.

   - Triggering a yes or no vote on the initial page will update all
     the other pages' content.


That's what I have, so far.
