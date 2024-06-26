const express = require("express");
require('dotenv').config();
const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");
const {  ContainerClient, StorageSharedKeyCredential, BlobServiceClient } = require("@azure/storage-blob");
const account = "detailsproject";
const accountKey = process.env.ACCOUNTKEY;
const tableName = 'details';
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());





app.get("/api/v1/details", async (req,res)=>{
    const credential = new AzureNamedKeyCredential(account, accountKey);
    const client = new TableClient(`https://${account}.table.core.windows.net`, tableName, credential);
    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
    const baseUrl = `https://${account}.blob.core.windows.net`;
    const containerName = 'details';

    const containerClient = new ContainerClient(`${baseUrl}/${containerName}`, sharedKeyCredential);

    try {
        let entities = [];
        let blobs = [];

        // Retrieve all entities from the table
        const entitiesIter = client.listEntities();
        const blobsIter = containerClient.listBlobsFlat();

        for await (const entity of entitiesIter) {
            
            entities.push({
                ProdId: entity.ProdId,
                ProdName: entity.ProdName,
                cost: entity.cost,
                image: null// Initialize name field for image
            });
        }

        for await (const blob of blobsIter) {
            blobs.push(blob.name);
        }

         // Assign blobs to entities sequentially
         for (let i = 0; i < entities.length; i++) {
            if (i < blobs.length) {
                entities[i].image = blobs[i];
            } else {
                entities[i].image = null; // Assign null if no more blobs are available
            }
        }

        // Log the final entities to verify matching
        res.json(entities, null, 2);
    } catch (error) {
        console.error("Error retrieving entities:", error.message);
        res.status(500).json({ error: "Failed to retrieve entities" });
    }

})




app.post("/api/v1/add", async (req,res)=>{
    const credential = new AzureNamedKeyCredential(account, accountKey);
    const client = new TableClient(`https://${account}.table.core.windows.net`, tableName, credential);

    const {rowKey, ProdId, ProdName, cost } = req.body;
  
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < chars.length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let partitionKey = result;

    // Create entity object to insert into table
    const testEntity = {partitionKey, rowKey, ProdId, ProdName, cost };

    // Insert entity into table
    await client.createEntity(testEntity);

    res.json({message: "Entity added successfully"});
})




app.listen(3000);