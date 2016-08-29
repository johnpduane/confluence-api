/**
 * Tests for confluence.js
 *
 * Note that there are dependencies between some of these tests.
 * For instance, the delete tests clean up content created in post tests.
 * This design is intentional to speed execution of the full suite.
 * So, running these tests using mocha's -g or -f options may cause tests to
 * fail or to leave test data in the test confluence space.
 */

var expect = require('chai').expect;
var Confluence = require("../lib/confluence");
var path = require("path");
var fs = require('fs');

var config = {
    username: "testuser",
    password: "test-user-pw",
    baseUrl:  "https://confluence-api-test.atlassian.net/wiki"
};
var space = "TEST";
var query = "label=global:test";
var title = "TestPage" + Date.now();
var pageContent = "<p>This is a new page with awesome content! Updated " +
                   new Date().toISOString() + "</p>";
var homePageId = "491524";
var testPageId = "491526";
var newPageId = 0;
var version = 0;

var filePath = __dirname + "/file.txt";
fs.writeFileSync(filePath, "This is some text");
var attachmentId = 0;

describe('Confluence API', function () {
    this.timeout(0);

    describe('Constructor: #confluence', function(){

        it('should throw an error if no config object is passed in', function(){
            var msg = "Confluence module expects a config object.";
            expect(function(){
                var confluence = new Confluence();
            }).to.throw(msg);
        });

        it('should throw an error if config is missing username and password', function(){
            var msg = "Confluence module expects a config object with both a username and password.";
            expect(function(){
                var confluence = new Confluence({});
            }).to.throw(msg);
        });

        it('should throw an error if config is missing baseUrl', function(){
            var msg = "Confluence module expects a config object with a baseUrl.";
            expect(function(){
                var confluence = new Confluence({
                    username: "test user",
                    password: "test pw"
                });
            }).to.throw(msg);
        });

        it('should return an instanceof Confluence with "new" keyword', function(){
            var confluence = new Confluence(config);
            expect(confluence).to.be.a.instanceof(Confluence);
        });

        it('should return an instanceof Confluence without "new" keyword', function(){
            var confluence = Confluence(config);
            expect(confluence).to.be.a.instanceof(Confluence);
        });

    });

    describe('#getSpace', function () {
        it('should get space information', function (done) {
            var confluence = new Confluence(config);
            confluence.getSpace(space, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.results[0].id).to.exist;
                done();
            });
        });
    });

    describe('#getSpaceHomePage', function () {
        it('should get a space home page', function (done) {
            var confluence = new Confluence(config);
            confluence.getSpaceHomePage(space, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.id).to.exist;
                done();
            });
        });
    });

    describe('#postContent', function () {
        it('should post/create page content by space and title', function (done) {
            var confluence = new Confluence(config);
            confluence.postContent(space, title, pageContent, null, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.body.storage.value).to.equal(pageContent);
                newPageId = data.id;
                expect(newPageId).not.to.be.null;
                version = data.version.number;
                expect(version).to.be.above(0);
                done();
            });
        });
    });

    describe('#putLabel', function () {
        it('should put/update page labels', function (done) {
            var confluence = new Confluence(config);
            var content = [{name:'test'}];
            version++;
            confluence.putLabel(space, newPageId, version, title, content, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                done();
            });
        });
    });

    describe('#getContentById', function () {
        it('should get/read page content by space and title', function (done) {
            var confluence = new Confluence(config);
            confluence.getContentById(homePageId, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.id).to.equal(homePageId);
                done();
            });
        });
    });

    describe('#getCustomContentById', function() {

        it('should get/read default expanded content', function(done) {
            var confluence = new Confluence(config);
            var options = {id: homePageId}
            
            confluence.getCustomContentById(options, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.id).to.equal(homePageId);
                expect(data.version).not.to.be.null;
                expect(data.body.storage).not.to.be.null;
                expect(data.body.metadata).to.be.undefined;
                done();
            });
        });

        it('should get/read explicit expander content', function(done) {
            var confluence = new Confluence(config);
            var options = {
                id: homePageId,
                expanders: ['version', 'metadata']
            }
            
            confluence.getCustomContentById(options, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.id).to.equal(homePageId);
                expect(data.version).not.to.be.null;
                expect(data.body).to.be.undefined;
                expect(data.metadata).not.to.be.null;
                done();
            })
        });
    })

    describe('#getContentByPageTitle', function () {
        it('should get/read page content by space and title', function (done) {
            var confluence = new Confluence(config);
            confluence.getContentByPageTitle(space, title, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.results[0].body.storage.value).to.equal(pageContent);
                done();
            });
        });
    });

    describe('#putContent', function () {
        it('should put/update page content', function (done) {
            var confluence = new Confluence(config);
            version++;
            pageContent += "<p>More awesome content!</p>";
            confluence.putContent(space, newPageId, version, title, pageContent, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.body.storage.value).to.equal(pageContent);
                done();
            });
        });
    });

    describe('#createAttachment', function() {
        it('should create an attachment on the page. Could fail if file exists on this page.', function (done) {
            var confluence = new Confluence(config);
            confluence.createAttachment(space, newPageId, filePath, function (err, data) {
                expect(err).to.be.null;
                expect(data.results).not.to.be.null;
                expect(data.results[0].title).to.be.equal(path.basename(filePath));
                done();
            });
        });

        it('should be able to get attachments on this page. ', function (done) {
            var confluence = new Confluence(config);
            confluence.getAttachments(space, newPageId, function (err, data) {
                expect(err).to.be.null;
                expect(data.results).not.to.be.null;
                attachmentId = data.results[0].id;
                expect(data.results[0].title).to.be.equal(path.basename(filePath));
                done();
            });
        });

        it('should be able to update attachments data ', function(done){
            var confluence = new Confluence(config);
            fs.writeFileSync(filePath, "This is extra cool data ");
            confluence.updateAttachmentData(space, newPageId, attachmentId, filePath, function(err, data) {
                expect(err).to.be.null;
                expect(data.title).to.be.equal(path.basename(filePath));
                done();
            });
        });
    });

    describe('#deleteContent', function () {
        it('should delete a page', function (done) {
            var confluence = new Confluence(config);
            confluence.deleteContent(newPageId, function(err, data) {
                expect(err).to.be.null;
                expect(data.statusCode).to.equal(204);
                done();
            });
        });
    });

    describe('#search', function () {
        it('should get information for query', function (done) {
            config.version = 4;
            var confluence = new Confluence(config);
            confluence.search(query, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                done();
            });
        });
    });

    describe('#pluginsSearch', function () {
        it('should get information in plugin for query ', function (done) {
            var confluence = new Confluence(config);
            var path  = '/rest/api/content/';
            var query = homePageId + '?expand=body.storage,version';
            confluence.pluginsSearch(path, query, function(err, data) {
                expect(err).to.be.null;
                expect(data).not.to.be.null;
                expect(data.id).to.equal(homePageId);
                done();
            });
        });
    });
});