var express = require('express');
var cors = require('cors');
var bcrypt = require('bcryptjs');

var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;

var app = express();
app.use(cors());

var knex = require('knex')({
    client: 'pg',

    connection: {
        host: 'localhost',
        user: 'postgres',
        password: 'admin',
        database: 'postgres',
        charset: 'utf8'
    }
});

var bookshelf = require('bookshelf')(knex);


var user = bookshelf.Model.extend({
    tableName: '_user',
    initialize: function () {
        const saltRounds = 10;
        this.on('creating', () => {
            let salt = bcrypt.genSaltSync(saltRounds);
            let hash = bcrypt.hashSync(this.get('password'), salt);
            this.set('password', hash)
        })
    },
    validPassword: function (password) {
        console.log("Password: " + password)
        console.log("dbPassword: " + this.get('password'))
        return (this.get('password') === password)
    },
    comparePassword: function (enteredPassword) {

        return bcrypt.compareSync(enteredPassword, this.get('password'));
    },
    posts: function () {
        return this.hasMany(post, 'user_id');
    },
    likes: function () {
        return this.hasMany(likes, 'user_id')
    },
    comments: function () {
        return this.hasMany(post_comment, 'user_id')
    },
    comment_likes: function () {
        return this.hasMany(comment_likes, 'user_id')
    },
    replies: function () {
        return this.hasMany(reply, 'user_id')
    }
});

var post = bookshelf.Model.extend({
    tableName: 'post',
    user: function () {
        return this.belongsTo(user);
    },
    likes: function () {
        return this.hasMany(likes, 'post_id')
    },
    comments: function () {
        return this.hasMany(comments, 'post_id')
    }

})

var likes = bookshelf.Model.extend({
    tableName: 'likes',
    user: function () {
        return this.belongsTo(user);
    },
    post: function () {
        return this.belongsTo(post);
    }

})

var comments = bookshelf.Model.extend({
    tableName: 'post_comment',
    user: function () {
        return this.belongsTo(user);
    },
    post: function () {
        return this.belongsTo(post);
    },
    likes: function () {
        return this.hasMany(comment_likes, 'comment_id')
    },
    replies: function () {
        return this.hasMany(reply, 'comment_id')
    }
})

var comment_likes = bookshelf.Model.extend({
    tableName: 'comment_like',
    user: function () {
        return this.belongsTo(user);
    },
    comment: function () {
        return this.belongsTo(comments);
    }
})

var reply = bookshelf.Model.extend({
    tableName: 'reply',
    user: function () {
        return this.belongsTo(user);
    },
    comment: function () {
        return this.belongsTo(comments);
    }
})


passport.use(new LocalStrategy(
    function (username, password, done) {
        user
            .where('user_name', username)
            .fetch()
            .then(function (user) {

                console.log("User: " + JSON.stringify(user))
                // console.log("validPassword: "+user.validPassword(password))

                if (!user) {
                    console.log('Incorrect username')
                    return done(null, false, { message: 'Incorrect username' });
                }
                if (!user.comparePassword(password)) {
                    console.log('Incorrect password')
                    return done(null, false, { message: 'Incorrect password' });
                }
                console.log('Success !')
                return done(null, user);
            }).catch(function (err) {
                return done(err);
            });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    user.where('id', id).fetch().then(function (user) {
        done(null, user);
    }).catch(function (err) {
        done(err, user);
    })
});

var router = express.Router();

router.route('/')
    .post(function (req, res) {

        new user({
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            email: req.body.email,
            user_name: req.body.userName,
            password: req.body.password
        })
            .save()

            .then(function (response) {
                console.log("User Registered")
                res.json({

                    response
                });
            });


    })

    .get(function (req, res) {
        res.json({
            text: "YEAH !"
        });
    });

router.route('/login')
    .post(passport.authenticate('local'), function (req, res) {
        console.log("logged in")
        res.json(req.user);

    });


router.route('/post')
    .post(function (req, res) {
        new post({
            description: req.body.description,
            user_id: req.body.userId

        })
            .save()
            .then(function (response) {
                console.log("Content posted")
                res.json({
                    response
                })
            })
    }


    );

router.route('/post/:id')
    .get(function (req, res) {
        user.where('id', req.params.id).fetch({
            withRelated: [{
                'posts': function (qb) {
                    qb.orderBy('id', 'DESC')
                }
            }]
        }).then(function (user) {

            res.json({
                posts: user.related('posts')
            })

        }


            );
    });

router.route('/post')
    .get(function (req, res) {
        post.forge().orderBy('id', 'DESC').fetchAll().then(function (posts) {

            res.json({
                posts: posts
            })

        }


        );
    });


router.route('/post/like')
    .post(function (req, res) {
        new likes({
            user_id: req.body.userId,
            post_id: req.body.postId

        })
            .save()
            .then(function (response) {
                console.log("Liked")
                res.json({
                    response
                })
            })
    }

    );

router.route('/post/like/:userId/:postId')
    .get(function (req, res) {
        likes.where({ 'user_id':req.params.userId    , 'post_id': req.params.postId }).fetch()
            .then(function (like) {

                res.json({
                    like: like
                })

            }


            );
    });

router.route('/post/like/:postId')
    .get(function (req, res) {
        likes.where({'post_id': req.params.postId }).fetch()
            .then(function (likes) {
                var x;
                for(x in likes){
                    console.log(x)
                }
                

            }


            );
    });
router.route('/post/like/:id')
    .delete(function (req, res) {
        new likes({ id: req.params.id })
            .destroy()
            .then(function (model) {
                res.json(model)
            })
    });

router.route('/post/comment')
    .post(function (req, res) {
        new comments({
            body: req.body.body,
            user_id: req.body.userId,
            post_id: req.body.postId

        })
            .save()
            .then(function (response) {
                console.log("commented")
                res.json({
                    response
                })
            })
    }

    );

router.route('/post/comment/:postId')
    .get(function (req, res) {
        post.where({ 'id': req.params.postId, }).fetch({
            withRelated: ['comments']
        }).then(function (post) {

            res.json({
                comments: post.related('comments')
            })

        }


            );
    });

router.route('/:id')
    .get(function (req, res) {
        user.where({ 'id': req.params.id, }).fetch().then(function (user) {

            res.json(user)

        }


        );
    });


router.route('/post/comment/like')
    .post(function (req, res) {
        new comment_likes({
            user_id: req.body.userId,
            comment_id: req.body.commentId

        })
            .save()
            .then(function (response) {
                console.log("Comment Liked")
                res.json({
                    response
                })
            })
    }

    );

router.route('/post/comment/like/:id')
    .delete(function (req, res) {
        new comment_likes({ id: req.params.id })
            .destroy()
            .then(function (model) {
                res.json(model)
            })
    });

// router.route('/post/comment/like/:commentId')
// .get(function (req, res) {
//     comments.where({ 'id': req.params.commentId, }).fetch({
//         withRelated: ['likes']
//     }).then(function (comments) {

//         res.json({
//             likes: comments.related('likes')
//         })

//     }


//         );
// });

router.route('/post/comment/like/:userId/:commentId')
    .get(function (req, res) {
        comment_likes.where({ 'user_id': req.params.userId, 'comment_id': req.params.commentId }).fetch()
            .then(function (like) {

                res.json({
                    like: like
                })

            }


            );
    });

router.route('/post/comment/reply')
    .post(function (req, res) {
        new reply({
            body: req.body.body,
            user_id: req.body.userId,
            comment_id: req.body.commentId

        })
            .save()
            .then(function (response) {
                console.log("replied")
                res.json({
                    response
                })
            })
    }

    );

router.route('/post/comment/reply/:commentId')
    .get(function (req, res) {
        comments.where({ 'id': req.params.commentId, }).fetch({
            withRelated: ['replies']
        }).then(function (comments) {

            res.json({
                replies: comments.related('replies')
            })

        }


            );
    });







module.exports = router;

