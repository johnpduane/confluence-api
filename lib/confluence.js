/**
 * Node.js wrapper for Atlassian's Confluence API.
 * See https://developer.atlassian.com/confdev/confluence-rest-api
 *
 * Copyright (c) 2015, John Duane
 * Released under the MIT License
 */

var request = require('superagent');

/**
 * Construct Confluence.
 *
 * @constructor
 * @this {Confluence}
 * @param {Object} config
 * @param {string} config.username
 * @param {string} config.password
 * @param {string} config.baseUrl
 *
 */
function Confluence(config) {
    if (!(this instanceof Confluence)) return new Confluence(config);

    if (!config) {
        throw new Error("Confluence module expects a config object.");
    }
    else if (!config.username || ! config.password) {
        throw new Error("Confluence module expects a config object with both a username and password.");
    }
    else if (!config.baseUrl) {
        throw new Error("Confluence module expects a config object with a baseUrl.");
    }

    this.config = config;
}

function processCallback(cb, err, res) {
    if (err || !res || !res.body) {
        cb(err, res);
    }
    else {
        cb(err, res.body);
    }
}

/**
 * Get space information.
 *
 * @param {string} space
 * @param {Function} callback
 */
Confluence.prototype.getSpace = function(space, callback){

    request
        .get(this.config.baseUrl + "/rest/api/space?spaceKey=" + space)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Get space home page.
 *
 * @param {string} space
 * @param {Function} callback
 */
Confluence.prototype.getSpaceHomePage = function(space, callback){
    var config = this.config;

    request
        .get(config.baseUrl + "/rest/api/space?spaceKey=" + space)
        .auth(config.username, config.password)
        .end(function(err, res){
            if (err) {
                callback(err);
            }
            else {
                try {
                    request
                        .get(config.baseUrl + res.body.results[0]._expandable.homepage)
                        .auth(config.username, config.password)
                        .end(function(err, res){
                            processCallback(callback, err, res);
                        });
                }
                catch (e) {
                    callback("Can't find space home page. " + e.message, res);
                }
            }
        });

};

/**
 * Get stored content for a specific space and page title.
 *
 * @param {string} id
 * @param {Function} callback
 */
Confluence.prototype.getContentById = function(id, callback){

    request
        .get(this.config.baseUrl + "/rest/api/content/" + id + "?expand=body.storage,version")
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Get stored content for a specific space and page title.
 *
 * @param {string} space
 * @param {string} title
 * @param {Function} callback
 */
Confluence.prototype.getContentByPageTitle = function(space, title, callback){
    var query =
        "?spaceKey=" + space +
        "&title=" + title +
        "&expand=body.storage,version";

    request
        .get(this.config.baseUrl + "/rest/api/content" + query)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Post content to a new page.
 *
 * @param {string} space
 * @param {string} title
 * @param {string} content
 * @param {number} parentId - A null value will cause the page to be added under the space's home page
 * @param {Function} callback
 */
Confluence.prototype.postContent = function(space, title, content, parentId, callback){
    var config = this.config;
    var page = {
        "type": "page",
        "title": title,
        "space": {
            "key": space
        },
        "ancestors": [{
            "type": "page"
        }],
        "body": {
            "storage": {
                "value": content,
                "representation": "storage"
            }
        }
    };

    function createPage() {
        request
            .post(config.baseUrl + "/rest/api/content")
            .auth(config.username, config.password)
            .type('json')
            .send(page)
            .end(function(err, res){
                processCallback(callback, err, res);
            });
    }

    if (!parentId) {
        this.getSpaceHomePage(space, function(err, res) {
            if (err) callback(err);
            else if (!res || !res.id) {
                callback("Can't find space home page.");
            }
            else {
                page.ancestors[0].id = res.id;
                createPage();
            }
        });
    }
    else {
        page.ancestors[0].id = parentId;
        createPage();
    }

};

/**
 * Put/update stored content for a page.
 *
 * @param {string} space
 * @param {string} id
 * @param {number} version
 * @param {string} title
 * @param {string} content
 * @param {Function} callback
 */
Confluence.prototype.putContent = function(space, id, version, title, content, callback){
    var page = {
        "id": id,
        "type": "page",
        "title": title,
        "space": {
            "key": space
        },
        "version": {
            "number": version,
            "minorEdit": false
        },
        "body": {
            "storage": {
                "value": content,
                "representation": "storage"
            }
        }
    };

    request
        .put(this.config.baseUrl + "/rest/api/content/" + id + "?expand=body.storage,version")
        .auth(this.config.username, this.config.password)
        .type('json')
        .send(page)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Delete a page.
 *
 * @param {string} id
 * @param {Function} callback
 */
Confluence.prototype.deleteContent = function(id, callback){

    request
        .del(this.config.baseUrl + "/rest/api/content/" + id)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            callback(err, res);
        });

};


module.exports = Confluence;