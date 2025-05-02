# my-node-ts-project/my-node-ts-project/README.md

# My Node.js and TypeScript Project

This project is a Node.js application built with TypeScript that implements user authentication using JWT and MongoDB with Mongoose.

## Features

- User registration and login
- JWT-based authentication
- MongoDB database integration
- TypeScript for type safety

## Technologies Used

- Node.js
- Express
- Mongoose
- JSON Web Token (JWT)
- bcryptjs for password hashing
- TypeScript

## Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```
   cd my-node-ts-project
   ```

3. Install the dependencies:

   ```
   npm install
   ```

## Development

To run the project in development mode, use:

```
npm run dev
```

This will start the server with nodemon, which automatically restarts the server on file changes.

## Environment Variables

Make sure to set up your environment variables for database connection and JWT secret. You can create a `.env` file in the root directory with the following variables:

```
MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
```

## Usage

- The server runs on port 5000 by default. You can access the API at `http://localhost:5000/api/auth`.
- Use the following endpoints for authentication:
  - `POST /api/auth/register` - Register a new user
  - `POST /api/auth/login` - Login an existing user

## License

This project is licensed under the MIT License.