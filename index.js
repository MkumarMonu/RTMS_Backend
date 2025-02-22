import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./src/Routes/usersRoutes.js";
import wellMasterRoutes from "./src/Routes/wellMasterRoutes.js";
import Mongodb from "./src/Database/connectToDatabase.js";
import connectCloudinary from "./src/Config/cloudinary.js";
import fileUpload from "express-fileupload";
import deviceRouter from "./src/Routes/deviceManagerRoutes.js";
import externaldeviceRouter from "./src/Routes/externalDeviceRoutes.js";
import organizationRouter from "./src/Routes/organizationsRoutes.js";
import { WebSocketServer } from "ws";
import operationRouter from "./src/Routes/operationRoutes.js"
import messageBoxRouter from "./src/Routes/messageBoxRoutes.js";
import http from "http";
import { Server } from "socket.io";
dotenv.config();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  path: '/io',
  cors: "*"
});
const PORT = process.env.PORT || 5000;
connectCloudinary();

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp",
  })
);

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/organization", organizationRouter);
app.use("/api/v1/wellmaster", wellMasterRoutes);
app.use("/api/v1/devicemanager", deviceRouter);
app.use("/api/v1/externaldevice", externaldeviceRouter);
app.use("/api/v1/operation", operationRouter);
app.use("/api/v1/message", messageBoxRouter);

// same method to emit event from server
app.use("/api/test", (req, res) => {
  io.emit("testEvent", JSON.stringify({ name: "Pranav", email: "praispranav", id: Math.floor(Math.random() * 100) }))
  res.json({ message: "Task Done" });
})

io.on('connection', (socket) => {
  // console.log("SOCKET", socket);
})

// Remove this duplicate listen
// const server = app.listen(PORT, () => {

// Use only this one
server.listen(PORT, () => {
  Mongodb();
  console.log(`Server is running on port ${PORT}`);
});







// WebSocket server setup
// const wss = new WebSocketServer({ server });

// // Broadcast function to send messages to all connected clients
// const broadcast = (data) => {
//   wss.clients.forEach((client) => {
//     if (client.readyState === client.OPEN) {
//       client.send(JSON.stringify(data));
//     }
//   });
// };

// // Event handling for new WebSocket connections
// wss.on("connection", (ws) => {
//   console.log(`WebSocket connecteding on port ${PORT}`);

//   // Listen for messages from clients
//   ws.on("message", (data) => {
//     console.log("Received data from client: %s", data);

//     // Here, you can process the received data if necessary
//     ws.send(JSON.stringify({ message: "Thank you for sending Well data!" }));
//   });

//   ws.on("close", () => console.log("WebSocket connection closed"));
// });

// export { broadcast };
