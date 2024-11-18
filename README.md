# Chirp Server

Remote deploy doc: https://docs.google.com/document/d/1IonmV_BOxkqI56iw6IVp4ZT0CnO6Tb7wae3rO7opB3M/edit

[Project Index Doc](https://docs.google.com/document/d/1WC8eKnYijWmRO7eOeEbbEBjopqHpNJqIbNR4QR5AiE0/edit?usp=sharing)

## Setup Locally

This is going to be your best option for regular development. It will continue to be the case until I have a process for setting up through Vagrant

### Database Setup

-   Make sure you have a [mariadb build installed on your computer](https://mariadb.com/resources/blog/installing-mariadb-10-1-16-on-mac-os-x-with-homebrew/)

*   After step 7 (run `brew services start mariadb` and `mysql_install_db`), you may need to run `sudo mariadb-secure-installation`. Follow instructions to set a root password.

-   Access mariadb with `mariadb -u root -p`.
-   Create the chirp database `CREATE DATABASE chirp;`
-   Exit mariadb, then navigate to the chirp-server directory and import the structure `mysql -u root -p chirp < chirp.sql` (sudo may be required for this operation)
-   Repeat the previous three steps to create an additional empty database (`CREATE DATABASE chirptest;`) for the sake of testing (`mysql -u root -p chirptest < chirp.sql`); if prompted for a password, this will be your mariadb password from the first access step 
-   Choose a username and password for a test user, and a username and password for a test super user
-   Access mariadb with `mariadb -u root -p` (again)
-   Add both test users to the chirptest database with `CREATE USER '<username>'@localhost IDENTIFIED BY '<password>';` (you'll run this twice, once for each username and password pair from the previous step)
-   Grant the super user all permissions using `GRANT ALL PRIVILEGES ON *.* TO 'username'@'localhost';`
-   Set the credentials of the super user to **DB_SUPERUSER** and **DB_SUPERUSERPW** in .env
-   Set the credentials of the user to DB_USER and DB_USERPW in .env

### Server Setup

The chirp server runs on node.js, to set up your dependencies, navigate into the directory and run: `npm install`
to start the server, run: `npm start`

### Env Structure

If you do not already have a .env in Chirp/chirp_server/ then create one `touch Chirp/chirp_server/.env`

Insert the following structure into that file.

```
SESSION_SECRET="<random_string>"
SERVER_HOST="<server_host_ip>"
SERVER_PORT="<server_port_number>"
DB_HOST="<database_host>"
USAGE_PERIOD_EXPIRATION="<random_string>"
DB_NAME="<chirp_database_name>"
DB_USER="<chirp_user_name>"
DB_USERPW="<chirp_user_password>"
DB_SUPERUSER="<superuser_name>"
DB_SUPERUSERPW="<superuser_password>"
```

## Endpoint Overview

| endpoint                | method | body                                                                                                                                            | returns                                                                                                                                                                                                              |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /user                   | post   | token (string)                                                                                                                                  | userID: internal userid                                                                                                                                                                                              |
|                         |        |                                                                                                                                                 |
| /login                  | post   | token (string)                                                                                                                                  | userID: internal userid                                                                                                                                                                                              |
|                         |        |                                                                                                                                                 |
| /usage_period           | post   | null                                                                                                                                            | usagePeriodID: usage_period id                                                                                                                                                                                       |
|                         |        |                                                                                                                                                 |
| /usage_period/end       | post   | null                                                                                                                                            | null                                                                                                                                                                                                                 |
|                         |        |                                                                                                                                                 |
| /post                   | post   | main_emoji (string)<br>story_emojis (string)                                                                                                    | post_id (int)                                                                                                                                                                                                        |
|                         |        |                                                                                                                                                 |
| /post/:post_id/reaction | post   | post_id (int) - id of post reacting on<br>react_emoji (string) - emoji reacting with<br>react_time (timestamp) - user local time                | react_id (int)                                                                                                                                                                                                       |
|                         |        |                                                                                                                                                 |
| /post/:post_id/reaction | delete | post_id(int) - id of post removing reaction<br>react_emoji (string) - emoji removing                                                            | null                                                                                                                                                                                                                 |
|                         |        |                                                                                                                                                 |
| /user/posts             | get    | null                                                                                                                                            | reverse chronological table of given user posts<br>[post id, time posted, main emoji, story emojis]                                                                                                                  |
|                         |        |                                                                                                                                                 |
| /user/:id               | get    | null                                                                                                                                            | [username, avatar]                                                                                                                                                                                                   |
|                         |        |                                                                                                                                                 |
| /posts                  | get    | num_posts (int) - max # of posts to return<br>last_post_id (int) - id of last post you have (lowest post_id) (-1 if fetching most recent posts) | reverse chronological list of [post id, poster username, poster id, poster avatar, post timestamp, main emoji,<br>story emojis, react type, count of react type on this post,<br>current user react (NULL if none)]) |

## Testing

Testing is done using mocha
Run the test suite with `npm test`

Errors are disabled temporarily by the testing suite, if you would like to see errors, disable this error muting in **tests.js**, which acts as a test manager.

Make sure that **DB_SUPERUSER** and **DB_PASSWORD** are both set in your .env file according to the credentials of your root mariadb user.

## Notes

-   IDs are assigned automatically by an increment function, so retrieving items with ID greater than n will fetch items created after the item with ID n.

-   If you get `error 1449`, go into `chirp.sql` and make sure the definer under each view is set to `'youruser'@'yourhost'`.

-   Two [middlewares](https://expressjs.com/en/guide/using-middleware.html) exist within the project

    -   `authenticate.js` will throw an error if the user is not logged in.
    -   `update_usage_period.js` will either update an existing usage period if it has not expired, or it will generate
        a new usage period if the existing usage period has expired.

-   All timestamps are UTC

## Environment

`.env` example:

```
# String used to secure session data
SESSION_SECRET="chickenzrule"
# Name of database
DB_NAME="chirp"
# Name of database user
DB_USER="username"
# Password for database
DB_USERPW="password"
# Database host
DB_HOST="localhost"
# Superuser username for database (used for testing)
DB_SUPERUSER="superusername"
# Superuser password for database (used for testing)
DB_SUPERUSERPW="superpassword"
# Time for usage period to expire in ms
USAGE_PERIOD_EXPIRATION=5000
# Server hostname
SERVER_HOST="localhost"
# Server port on host
SERVER_PORT=3000
```

# DEPRECATED:

## Setup Through Docker

This is the best option for testing frontend, but is not good for modifying/testing backend. This will run the version of chirp*server \_on your local machine* with the same OS/settings as the server. It will also automatically set up the database. Note that every time you run this it will _reset the database to empty_.

-   download and install Docker https://hub.docker.com/editions/community/docker-ce-desktop-mac/
-   Ask Talie for the docker-compose.yaml file and put it one level up (in Chirp, on the same level as chirp_server)
-   Navigate to /Chirp and run `docker-compose up`
-   If you make changes to chirp_server, cancel out of `docker-compose up`, run `docker-compose build`, then re-run `docker-compose up`
