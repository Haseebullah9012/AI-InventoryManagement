"use server"

//import { ImageAnalysisClient } from "@azure-rest/ai-vision-image-analysis";
const createClient = require('@azure-rest/ai-vision-image-analysis').default;
import { AzureKeyCredential } from "@azure/core-auth";

const key = process.env.AZURE_SUBSCRIPTION_KEY;
const endpoint = process.env.AZURE_ANALYZE_IMAGE_ENDPOINT;

const credential = new AzureKeyCredential(key);
const client = createClient(endpoint, credential, { apiVersion:"2024-02-01"});

export async function getImageLabels(formData) {
  
  let bodyContent;
  let imageContentType;

  //Check the Input Source
  if(formData.get("imageFile").size) {
    //From File Upload
    
    //Check for Valid FileType
    if(!formData.get("imageFile").type.includes("image")) {
      console.log(formData.get("imageFile").type);
      return "Upload some Valid Image File-type!";
    }
    
    const arrayBuffer = await formData.get("imageFile").arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);
    bodyContent = imageData;
    imageContentType = "application/octet-stream";
  }
  else if(formData.get("imageURL")) {
    //From URL Input 
    const imageURL = formData.get("imageURL");
    
    //Check for Valid URL
    try {
      const urlResponse = await fetch(imageURL);
      if(!urlResponse.ok)
        return "Unable to fetch Image from URL (Status not OK)";
      
      if(!urlResponse.headers.get('content-type')?.startsWith('image/'))
        return "That's not a Valid Image URL";
    }
    catch(error) {
      return "That's not a Valid URL";
    }
    
    bodyContent = { url: imageURL };
    imageContentType = "application/json";
  }
  else {
    //No Input
    return "Upload either an Image FIle, or Paste an Image URL... "
  }
  
  try {
    const result = await client.path('/imageanalysis:analyze').post({
      body: bodyContent,
      queryParameters: {
        features: [ 'Tags', 'Caption' ],
        language: 'en',
        "model-version": 'latest' 
      },
      contentType: imageContentType,
    });

    if(result.status==='200')
      return extractData(result.body);
  
    return "Error! Server respond not OK Status...";
  }
  catch(error) {
    console.error("An Error Occurred", error);
    return "Server Error.";
  }
}


function extractData(result) {
  const tags = result.tagsResult.values;
  const caption = result.captionResult;
  if(!tags.length)
    return 'No Objects Detected!';

  let tagString = '';
  tags.forEach(tag => {
    tagString += (tag.name + ' ');
  });
  tagString += "\n";
  tagString += caption.text; 
  
  return tagString;
}
