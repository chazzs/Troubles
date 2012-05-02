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
            itemId: 'gridHolder',
            flex:2
        }
    ],
    
    launch: function() {
        appInstance = this;
        this._installGrid();
    },
   
   _installGrid:function() {
        Rally.data.ModelFactory.getModel({
            type:'Defect',
            success:this._findProblems,
            scope: this,
        });
   },
   
   //Identify all tickets that have a problem; 
   _findProblems: function(model) {
       var selectHandler = Ext.bind(this._onSelect, this);
       this.down('#gridHolder').add({
             xtype: 'rallygrid',
             model: model,
             itemId: 'grid',
             listeners: {
                itemclick: {
                    fn: selectHandler
                }
                },
             columnCfgs:[
                  'FormattedID',
                  'Name',
                  'State'
              ],
         });
   
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
       this.problems = {};
       for (;index < reopenedTickets.length; index++) {   
           var ticketID = reopenedTickets[index].ObjectID.toString();       
           if (!this.problems[ticketID]) {
                  this.problems[ticketID] = {ReopenedCount:0};
           }
            this.problems[ticketID] ['ReopenedCount'] =  this.problems[ticketID] ['ReopenedCount'] +1;
       }
       this._renderProblemTicketGrid(this.problems);
   },
   
   _renderProblemTicketGrid:function(problems) {       
       this._showDetails("Select a Troubled ticket to see details");
      var filter = this._createFilter(problems);
      
        var gridHolder = this.down('#gridHolder');
        console.log('filtering');
        gridHolder.down('#grid').filter(filter);
   },
   
   _createFilter:function(problems) {
         var filter;
        if (problems.length == 0) {
            return  Ext.create('Rally.data.QueryFilter', {
                    property: 'ObjectID',
                    operator: '=',
                    value: ''
                });
          }
            for (var objectID in problems) {
                        var objectFilter = Ext.create('Rally.data.QueryFilter', {
                            property: 'ObjectID',
                            operator: '=',
                            value: objectID
                    });
                    if (filter == null) {
                        filter = objectFilter;
                    } else {
                        filter = filter.or(objectFilter);
                    }
            }
            console.log('filter string = ' + filter.toString());
            return filter;
   },
   
   //When a problem ticket is selected, update the details fields to show the identified problems
    _onSelect: function(view, record) {
        var oid = record.data.ObjectID.toString();
        this._showDetails(record.data.FormattedID + " was reopened " + this.problems[oid]['ReopenedCount'] + " times");
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