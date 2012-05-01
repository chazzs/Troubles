var appInstance;

var REOPEN_THRESHOLD = 1;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    items: [
        {
            xtype:'container',
            itemId:'details',
            flex:1
        },
        {
            xtype: 'container',
            itemId: 'grid',
            flex:2
        }
    ],
    
    launch: function() {
        appInstance = this;
        this._findProblems();
    },
   
   //Identify all tickets that have a problem; 
   _findProblems: function() {
        this._findReopenedTickets();
   },
   
   _findReopenedTickets: function()  {
        var handler = Ext.bind(this._reopenedTicketHandler, this);
       
        var query = {$and:[
                                            {Project:this.context.getProject().ObjectID},
                                            {State:"Open"},
                                           {'_PreviousValues.State':{$gt : "Open"}}
                                        ]}
        this._doSearch(query, handler);
   },
   
   _reopenedTicketHandler:function(reopenedTickets) {
       var objectID = reopenedTickets.length > 0 ? reopenedTickets[0].ObjectID : null;
       var index = 0;
       var reopenedCount = 0;
       var problems = [];
       
       for (;index < reopenedTickets.length; index++) {     
           if (objectID != reopenedTickets[index].ObjectID) {
                problems.push({ObjectID:objectID, ReopenedCount:reopenedCount});
                objectID = reopenedTickets[index].ObjectID;
                reopenedCount = 1;
           } else {
                reopenedCount++;
           }
       }
       this._renderProblemTicketGrid(problems);
   },
   
   _renderProblemTicketGrid:function(problems) {
      debugger;
   
       this._showDetails("Found " + problems.length + " problems");
   },
   
   //When a problem ticket is selected, update the details fields to show the identified problems
    _onSelect: function(view, record) {
        // var oid = record.data.ObjectID;
        // console.log(oid + ' was clicked', record.data);
        // this._getHistory(record.data, this._analyze);
    },
    
   
    
    _analyze:function(original, snapshots) {
        //console.log("Analyzing artifact " + snapshots[0].ObjectID);
        //do some analysis
        if(snapshots.length >= REOPEN_THRESHOLD) {
           appInstance._showDetails(original.FormattedID + " has been reopened " + snapshots.length + " times.");
        } else {
           appInstance._showDetails(original.FormattedID + "has no problems");
        }
        //debugger;
       // console.log("Analysis complete " + snapshots[0].ObjectID);
   },
    
    _showDetails:function(message) {
        var detailsContainer = this.down('#details');
        detailsContainer.update(message);
    },
   
    _doSearch: function(queryObject, callback){
        var workspace = this.context.getWorkspace().ObjectID;
        var queryUrl = 'https://rally1.rallydev.com/analytics/1.32/'+ workspace + '/artifact/snapshot/query.js';
        var params = {
            find:Ext.JSON.encode(queryObject),
            fields:true
        };
        
        Ext.Ajax.cors = true;
        Ext.Ajax.request({
            url: queryUrl,
            method: 'GET',
            params: params,
            withCredentials: true,
            success: function(response){
                var text = response.responseText;
                var json = Ext.JSON.decode(text);
                callback(json.Results);
            }
        });    
    },
    
});