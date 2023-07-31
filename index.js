/**
 * PUBLISHER SERVER
 *
 */
const express = require("express");
const amqp = require("amqplib");
const path = require("path");

const fs = require("fs");

const app = express();
const ops = ["ADD", "SUB", "DIV", "MULT"];
const PORT = 3000;
const logFilePath = "./log/log.txt";

const rabbitMQOptions = {
    hostname: "rabbitmq",
    port: 5672,
    username: "guest",
    password: "guest",
};

var q;
var channel;
var currTaskArr = [];
var comTaskArr = [];

async function initRabitMQ() {
    try {
        const connection = await amqp.connect(
            `amqp://${rabbitMQOptions.hostname}:${rabbitMQOptions.port}`,
            {
                username: rabbitMQOptions.username,
                password: rabbitMQOptions.password,
            }
        );
        console.log("Connected to RabitMQ");
        channel = await connection.createChannel();
        q = await channel.assertQueue("", { durable: false });
        channel.consume(
            q.queue,
            (msg) => {
                const cr = msg.properties.correlationId;
                console.log(cr);
                if (currTaskArr.includes(cr)) {
                    const mg = JSON.parse(msg.content.toString());
                    console.log("[%s] Got ans = %s", cr, mg);
                    insertToLocal(
                        `[${cr}] COMPLETED | A = ${mg.a} B = ${mg.b} OPT = ${mg.c} RESULT = ${mg.r}`
                    );
                    currTaskArr = remFromArr(currTaskArr, cr);
                    comTaskArr.push(cr);
                }
            },
            {
                noAck: true,
            }
        );
    } catch (error) {
        console.error("Error connecting to RabbitMQ:", error);
        process.exit(0);
    }
}

initRabitMQ();
app.get("/newtask", (req, res) => {
    try {
        msg = genData();
        nTaskId = genTaskId();
        currTaskArr.push(nTaskId);
        insertToLocal(
            `[${nTaskId}] PENDING | A = ${msg.a} B = ${msg.b} OPT = ${msg.c}`
        );
        channel.sendToQueue("task_pool", Buffer.from(JSON.stringify(msg)), {
            persistent: true,
            correlationId: nTaskId,
            replyTo: q.queue,
        });
        console.log(currTaskArr);

        res.send(`New Task Created Id == ${nTaskId}`).status(200);
    } catch (e) {
        res.send("ERROR OCCUR | " + e);
        console.error("ERROR OCC | " + e);
    }
});

app.get("/status", (req, res) => {
    try {
        res.send(
            ` CURRENT TASK STATUS COMPLETED = ${comTaskArr.length} PENDING = ${
                currTaskArr.length
            } TOTAL = ${comTaskArr.length + currTaskArr.length}`
        ).status(200);
    } catch (e) {
        res.send("ERROR OCCU | " + e);
        console.error(e);
    }
});

app.use("/file", (req, res) => {
    const options = {
        root: path.join(__dirname),
    };
    const fileName = "log.txt";
    res.sendFile(fileName, options, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log("Sent:", fileName);
        }
    });
});

app.listen(3000, () => {
    console.log("HTTP server listening on port = %s", PORT);
});

/*//////////////////////////////HELPER FUNCTIONS///////////////////////////////////////*/

const insertToLocal = (string) => {
    fs.appendFile(logFilePath, "\n" + string, (err) => {
        if (err) {
            console.error("Error appending to file:", err);
            return;
        }
    });
};

function genTaskId() {
    return Math.floor(Math.random() * 100000).toString();
}

function genData() {
    data = {
        a: Math.floor(Math.random() * 100),
        b: Math.floor(Math.random() * 100),
        c: ops[Math.floor(Math.random() * ops.length)],
    };
    return data;
}

function remFromArr(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}
