const db = require("../db")
const bcrypt = require("bcrypt")
const {BCRYPT_WORK_FACTOR} = require("../config")
const { BadRequestError, UnauthorizedError } = require("../utils/errors")
class User {
    static async makePublicUser(user) {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            created_at: user.created_at,
            updated_at: user.updated_at
        }
    }

    static async login(credentials) {
        //required fields are email and password, throw error if either are missing
        const requiredFields = ["email", 'password']
        requiredFields.forEach(field => {
            if (!credentials.hasOwnProperty(field)) {
                throw new BadRequestError(`Missing ${field} in request body.`)
            }
        })
        //looking the user in the db by email
        const user = await User.fetchUserByEmail(credentials.email)
        if (user) {
            const isValid = await bcrypt.compare(credentials.password, user.password)
            if (isValid) {
                return User.makePublicUser(user)
            }
        }
        // if the user is found, compare the password with the submitted password
        // if they match, return user
        // else throw an error
        throw new UnauthorizedError("Invalid email/password")
    }

    static async register(credentials) {
        //user should submit email, pw, resvp status and # of guest
        // if any of the field are missing, throw an error
        const requiredFields = ["email", 'username', 'first_name', 'last_name', 'password']
        requiredFields.forEach(field => {
            if (!credentials.hasOwnProperty(field)) {
                throw new BadRequestError(`Missing ${field} in request body.`)
            } 
            if (credentials.hasOwnProperty(field) && credentials[field] === '') {
                throw new BadRequestError(`Cannot have empty ${field} in request body.`)
            }
        })
        
        if(credentials.email.indexOf('@') <= 0) {
            throw new BadRequestError('Invalid email')
        }
        // make sure no user in db exist with that email
        // if user exist, throw an error
        const existingUser = await User.fetchUserByEmail(credentials.email)
        if (existingUser) {
            throw new BadRequestError(`Duplicate email: ${credentials.email}`)
        }
        
        const results = await db.query("SELECT username FROM users;")
        const usernames = results?.rows
        if (usernames.indexOf(credentials.username) !== -1) {
            throw new BadRequestError(`Duplicate username: ${credentials.username}`)
        }
        // hash user password
        
        const hashedPassword = await bcrypt.hash(credentials.password, BCRYPT_WORK_FACTOR)
        // lowercase email
        const lowercasedEmail = credentials.email.toLowerCase()
        //create new user in the db with given info
        const result = await db.query(`
            INSERT INTO users (
                email,
                password,
                first_name,
                last_name,
                username
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, password, first_name, last_name, username, created_at;
        `,
        [lowercasedEmail, hashedPassword, credentials.first_name, credentials.last_name, credentials.username]
        )
        //return user
        console.log(User.makePublicUser(result.rows[0]))
        return User.makePublicUser(result.rows[0])
    }

    static async update(creds) {
        //required fields are email and password, throw error if either are missing
        const requiredFields = ["email", 'password', 'location', 'date']
        requiredFields.forEach(field => {
            if (!creds.hasOwnProperty(field)) {
                throw new BadRequestError(`Missing ${field} in request body.`)
            }
        })
        //looking the user in the db by email
        const user = await User.fetchUserByEmail(creds.email)
        if (user) {
            const isValid = await bcrypt.compare(creds.password, user.password)
            if (isValid) {
                const result = await db.query(`
                    UPDATE users 
                    SET location = $1,
                        date = $2
                    WHERE email = $3
                    RETURNING id, email, password, first_name, last_name, location, date;
                `,
                [creds.location, creds.date, creds.email.toLowerCase()]
                )
                //return user
                return User.makePublicUser(result.rows[0])
            }
        }
        // if the user is found, compare the password with the submitted password
        // if they match, return user
        // else throw an error
        throw new UnauthorizedError("Invalid email/password")
    }

    static async cancel(creds) {
        //required fields are email and password, throw error if either are missing
        const requiredFields = ["email", 'password']
        requiredFields.forEach(field => {
            if (!creds.hasOwnProperty(field)) {
                throw new BadRequestError(`Missing ${field} in request body.`)
            }
        })
        //looking the user in the db by email
        const user = await User.fetchUserByEmail(creds.email)
        if (user) {
            const isValid = await bcrypt.compare(creds.password, user.password)
            if (isValid) {
                const result = await db.query(`
                    DELETE FROM users
                    WHERE email = $1;
                `,
                [creds.email.toLowerCase()]
                )
                //return user
                return {}
            }
        }
        // if the user is found, compare the password with the submitted password
        // if they match, return user
        // else throw an error
        throw new UnauthorizedError("Invalid email/password")
    }

    static async fetchUserByEmail(email) {
        if (!email) {
            throw new BadRequestError("No email provided")
        }

        const query = `SELECT * FROM users WHERE email = $1`

        const result = await db.query(query, [email.toLowerCase()])

        const user = result.rows[0]

        return user
    }
}

module.exports = User