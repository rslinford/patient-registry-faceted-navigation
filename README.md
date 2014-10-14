# Faceted Navigation Experiment
Data discovery via faceted navigation.

## Tech Stack
A single-page web application using Ajax calls to a Solr search engine.

* HTML
* CSS
* JavaScript
* JQuery
* Ajax Solr - JavaScript api for talking to a Solr instance
* Solr - instance not inlucded
* JSON - for all things Ajaxy

## The Reuters Example
Based on the Ajax Solr demo

https://github.com/evolvingweb/ajax-solr/tree/master/examples/reuters-requirejs

## AHRQ Solr Intance
Adapted to query AHRQ's Solr instance for Patient Registries. The official search UI:

https://patientregistry.ahrq.gov/

The AHRQ Solr instance is public and can be queried like any Solr engine:

https://patientregistry.ahrq.gov/solr/select?q=*:*&fl=idRopr&wt=json

## This UI
This experimental UI was originally hosted at:

http://solid-speeder-42-154124.use1-2.nitrousbox.com:4000/

Don't be surpised if the above link is dead. Installation is easy.

## Install
The root of the web-app under 'patnav'. Copy all files under 'patnav' to 
the public root of your favorite web server. Point Firefox or Chrome to 
the root of your web server.

After the browser had loaded the web-app all subsequent traffic goes to the AHRQ Solr instance.
The calls are asynchronous. You'll need access to the public interent.
