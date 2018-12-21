<template>
  <div id="app">
    <h2>Push the button, Max!!</h2>
    <div>{{serverTick}}</div>
    <br/>
    <div>
      <input placeholder="Enter name" 
          v-model="name" type="text" aria-label="Name"/>
      <button class="name-btn" @click="nameSet"
          :disabled="name.length === 0 || !inactive">Set</button>
    </div>
    <br/>
    <div>
      <button @click="submitClicked"
              :disabled="inactive">Submit Task!</button>
      <button @click="disconnectClicked"
              :disabled="inactive">Kill Task</button>
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
    <button @click="triggerServerResponseClicked"
            :disabled="inactive">Trigger Server Response</button>
  </div>
</template>
<style>
  body {font-family:Arial, Helvetica, sans-serif;
        text-align:center;}
  div, input, .name-btn {font-size: 2.0rem;}
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
import ServerEventClientFactory from '@aphorica/server-event-client';

export default {
  name: 'app',
  data: function() { return {
    APPURL: "http://localhost:3000",
    sseTaskClient: null,
    sseLTClient:null,
    name: "",
    message: "",
    response: "",
    state: "",
    serverTick: '00:00:00',
    adHocResponseCount: 0,
    registrants: {}
  }},
  async mounted() {
    this.setInitialState();
    await this.fetchRegistrants();
  },
  beforeDestroy() {
    if (this.sseLTClient !== null)
      this.sseLTClient.disconnect();
    if (this.sseTaskClient !== null)
      this.sseTaskClient.disconnect();
  },
  methods: {
    async nameSet() {
      let _this = this;
      this.sseLTClient = await ServerEventClientFactory.create(
        this.name, this.APPURL, {
          sseNotify(what) {
            switch(what) {
              case 'listeners-changed':
                _this.fetchRegistrants();
                break;
              case 'clock-tick':
                _this.serverTick = _this.makeTimeString(Date.now());
                break;
            }
          }
        });
                // long-term client - waits for notifications

      if (this.sseLTClient === null) {
        this.message = "!Error - could not create LT client"
      }

      await this.sseLTClient.listen('listeners-changed');
      await this.sseLTClient.listen('clock-tick');
      await this.fetchRegistrants();
    },
    async submitClicked(){
      if (this.sseTaskClient === null) {
        let _this = this;
        this.sseTaskClient = await ServerEventClientFactory.create(
          this.name, this.APPURL, {
            sseTaskCompleted(taskid) {
              _this.response = 'Task completed: ' + taskid;
            },
            sseAdHocResponse(){
              _this.response = "Got Ad Hoc response - " + ++_this.adHocResponseCount;
            },
            sseError(id, sseState, sseStateText) {
              _this.state = sseStateText;
            },
            sseClosed(){
              _this.sseTaskClient = null;
              _this.setInitialState();
            }
          });
      }

      if (this.sseTaskClient === null) {
        this.message = "!Error - could not create Task client";
      }

      else {
        let status = await this.sseTaskClient.submitTask('timeout_task');
        if (status) {
          this.message = "Submitted for: " + this.sseTaskClient.id;
          this.response = "(none)";
        } else {
          this.message = "Submission failed!";
          this.response = "Error!";
        }
      }
    },
    disconnectClicked() {
      this.sseTaskClient.disconnect();
    },
    clearRegistrantsClicked() {
      this.sseTaskClient.clearRegistrants();
      this.fetchRegistrants();
    },
    triggerServerResponseClicked() {
      this.sseTaskClient.triggerAdHocServerResponse();
    },
    triggerCleanupClicked() {
      this.sseTaskClient.triggerCleanup();
    },
    makeRegistrantLine(idKey) {
      return '<td>' + 
             idKey + 
             '</td><td>' + 
             this.makeTimeString(this.registrants[idKey]['registered-ts']) +
             '</td>';      
    },
    makeTimeString(timeStamp) {
      let dt = new Date(timeStamp);
      return dt.getDate() + ' ' + dt.getHours() + ':' + dt.getMinutes();
    },
    async fetchRegistrants() {
      if (this.sseLTClient !== null)
        this.registrants = await this.sseLTClient.fetchRegistrants();
    },
    setInitialState() {
      this.message = "Push the button...";
      this.response = "(none)";
      this.state = "(waiting)";
    }
  },
  computed: {
    inactive: function() {
      return this.sseTaskClient === null;
    }
  }
}
</script>
