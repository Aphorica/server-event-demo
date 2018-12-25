<template>
  <div id="app">
    <h2>Push the button, Max!!</h2>
    <div>{{serverTick}}</div>
    <br/>
    <div id="name-set">
      <input placeholder="Enter name"
        :disabled = "registered"
          v-model="name" type="text" aria-label="Name"/>
      <button class="name-btn" @click="nameSet"
          :disabled="name.length === 0 || registered">Set</button>
    </div>
    <br/>
    <div class="button-row">
      <button @click="submitClicked"
              :disabled="!registered">Submit Task!</button>
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
      <div v-if="!registered"><div>(Set name to see registrants...)</div></div>
      <table v-if="registered">
        <tr v-for="idKey in Object.keys(registrants)"
            :key="idKey">
          <td>{{idKey}}</td>
          <td>{{makeRegistrantLineTimeString(registrants[idKey]['registered-ts'])}}</td>
        </tr>
      </table>
    </div>
    <br/>
    <button @click="clearRegistrantsClicked">Clear Registrants</button>
    <button @click="triggerCleanupClicked">Trigger Cleanup</button><br/><br/>
    <button @click="triggerServerResponseClicked"
            :disabled="inactive">Trigger AdHoc Task Server Response</button>
  </div>
</template>
<style>
  body {font-family:Arial, Helvetica, sans-serif;
        text-align:center;}
  div, input, .name-btn {font-size: 1.5rem;}
  h2 {margin-top:0.5rem;}
  h2,h3 {margin-bottom:0.2rem;}
  table {font-size:1.2rem;border-collapse:collapse;}
  #name-set, #message-table, #table-ctnr {width: 90%; margin:0 auto;}
  #message-table, #table-ctnr {border:thin solid darkgray}
  #name-set {display:flex; flex-direction:row;}
  input {flex-grow: 1;}
  .button-row {display:flex; flex-direction:row;justify-content:center;}
  #table-ctnr {height:12rem;overflow-y:scroll;}
  #table-ctnr table {width:100%;}
  #table-ctnr table tr:nth-child(even) {background-color:#eee}
  #table-ctnr div {display:flex;flex-direction:column;justify-content:center;
                   height:100%;}
  td {padding-top:0.3em; padding-bottom:0.3em;}
  th {text-align:right;}
  td {text-align:left;padding-left:1rem;}
  button {font-size:1.2rem; border-radius:0.5em;background-color:lightgray;
          margin:0 0.5rem;user-select:none;}
  button:disabled, input:disabled { color:gray; }
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
  mounted() {
    this.setInitialState();
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
          sseOpened(state, stateText) {
            _this.fetchRegistrants();
          },
          sseNotify(what) {
            switch(what) {
              case 'listeners-changed':
                _this.fetchRegistrants();
                break;
              case 'clock-tick':
                _this.serverTick = _this.makeTickTimeString(Date.now());
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
    },
    async submitClicked(){
      if (this.sseTaskClient === null) {
        let _this = this;
        this.sseTaskClient = await ServerEventClientFactory.create(
          this.name, this.APPURL, {
            sseTaskCompleted(taskid) {
              switch(taskid) {
                case "timeout_task":
                  _this.response = 'Task completed: ' + taskid;
                  break;
                case "ad-hoc":
                  _this.response = "Got Ad Hoc response - " + ++_this.adHocResponseCount;
                  break;
                default:
                  console.error("sseTaskCompleted, bad taskid: " + taskid);
                  break;
              };
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
    triggerCleanupClicked() {
      this.sseTaskClient.triggerCleanup();
    },
    triggerServerResponseClicked() {
      this.sseTaskClient.submitTask('ad-hoc');
    },
    makeTickTimeString(timestamp) {
      return new Date(timestamp).toTimeString().substring(0, 8);
    },
    makeRegistrantLineTimeString(timeStamp) {
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
    },
    registered: function() {
      return this.sseLTClient !== null;
    }
  }
}
</script>
