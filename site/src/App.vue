<template>
  <div id="app">
    <h2>Push the button, Max!!</h2>
    <input placeholder="Enter name" 
        v-model="name" type="text" aria-label="Name"/>
    <br/><br/>
    <div>
      <button @click="submitClicked">Submit!</button>
      <button @click="disconnectClicked">Stop listening</button>
    </div>
    <br/>
    <table id="message-table">
      <tr><th>Message:</th><td>{{message}}</td></tr>
      <tr><th>Response:</th><td>{{response}}</td></tr>
      <tr><th>State:</th><td id="state">{{state}}</td></tr>
    </table>
    <h3>Registrants:</h3>
    <div id="table-ctnr">
    <table>
      <tr v-for="idKey in Object.keys(registrants)"
          :key="idKey">
        <td>{{idKey}}</td>
        <td>{{makeTimeString(registrants[idKey]['registered-ts'])}}</td>
      </tr>
    </table>
    </div>
    <br/>
    <button @click="clearRegistrantsClicked">Clear Registrants</button>
    <button @click="triggerCleanupClicked">Trigger Cleanup</button><br/><br/>
    <button @click="triggerServerResponseClicked">Trigger Server Response</button>
  </div>
</template>
<style>
  body {font-family:Arial, Helvetica, sans-serif;
        text-align:center;}
  div, input {font-size: 1.5em;}
  table {font-size:1.2rem;border-collapse:collapse;}
  #message-table, #table-ctnr {width: 90%; margin:0 auto;
                                border:thin solid darkgray}
  #table-ctnr {height:12rem;overflow-y:scroll;}
  #table-ctnr table {width:100%;}
  #table-ctnr table tr:nth-child(even) {background-color:#eee}
  td {padding-top:0.3em; padding-bottom:0.3em;}
  th {text-align:right;}
  td {text-align:left;padding-left:1rem;}
  button {font-size:1.2rem; border-radius:0.5em;background-color:lightgray;
          margin:0 0.5rem;user-select:none;}
  button:focus {outline:0;}
</style>
<script>
import ServerEventClientFactory from '@aph/server-event-client';

export default {
  name: 'app',
  data: function() { return {
    APPURL: "http://nebula.local:3000",
    sseClient: null,
    name: "",
    message: "Push the button...",
    response: "(none)",
    state: "(waiting)",
    adHocResponseCount: 0,
    registrants: {}
  }},
  methods: {
    async submitClicked(){
      if (this.sseClient === null) {
        this.sseClient = await ServerEventClientFactory.create(
          this.name, this.APPURL, this);
      }

      if (this.sseClient === null) {
        this.message = "!Error - could not create sseCient";
      }

      else {
        this.sseClient.submitTask('timeout');
        this.message = "Submitted for: " + this.sseClient.myID;
        this.response = "(none)";
      }
    },
    disconnectClicked() {
      this.sseClient.disconnect();
    },
    clearRegistrantsClicked() {
      this.sseClient.clearRegistrants();
      this.fetchRegistrants();
    },
    triggerServerResponseClicked() {
      this.sseClient.triggerAdHocServerResponse();
    },
    triggerCleanupClicked() {
      this.sseClient.triggerCleanup();
    },
    makeRegistrantLine(idKey) {
      return '<td>' + 
             idKey + 
             '</td><td>' + 
             this.makeTimeString(this.registrants[idKey]['registered-ts']) +
             '</td>';      
    },
    notImplemented() {
      alert("Not implemented...");
    },
    //
    // beg sse callbacks
    //
    sseListenersChanged() {
      this.fetchRegistrants();
    },
    sseTaskCompleted(id, taskid) {
      if (id !== this.sseClient.myID) {
        this.message = 'Got response for someone else: ' +
                       id + ', taskid' + taskid;
      }

      this.response = 'Task completed: ' + taskid;
    },
    sseRegistered(info) {
      this.message = "Registered: " + info;
      this.fetchRegistrants();
    },
    sseAdHockResponse() {
      this.response = "Got Ad Hoc response - " + ++this.adHocResponseCount;
    },
    sseOpened(sseState, sseStateText) {
      this.state = sseStateText;
    },
    sseError(sseState, sseStateText) {
      this.state = sseStateText;
    },
    sseClosed() {
      this.sseClient = null;
      this.registrants = [];
    },
    //
    // end sse callbacks
    // beg utils
    //
    makeTimeString(timeStamp) {
      let dt = new Date(timeStamp);
      return dt.getDate() + ' ' + dt.getHours() + ':' + dt.getMinutes();
    },
    async fetchRegistrants() {
      this.registrants = await this.sseClient.fetchRegistrants();
    }
  }
}
</script>
