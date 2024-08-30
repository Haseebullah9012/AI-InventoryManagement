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
  if(typeof(formData)==="string") {
    //From Camera Capture
    const arrayBuffer = convertDataURL_toArrayBuffer(formData);
    const imageData = new Uint8Array(arrayBuffer)
    bodyContent = imageData;
    imageContentType = "application/octet-stream";
  }
  else if(formData.get("imageFile")?.size) {
    //From File Upload
    const imageFile = formData.get("imageFile");
    
    if(!imageFile.type.includes("image"))
      return "Upload some Valid Image File-type!"; //Check for Valid Image-FileType
    
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);
    bodyContent = imageData;
    imageContentType = "application/octet-stream";
  }
  else if(formData.get("imageURL")) {
    //From URL Input 
    const imageURL = formData.get("imageURL");
    
    let urlStatus = await checkURLValidity(imageURL); //Check for Valid Image-URL
    if(urlStatus != "Valid")
      return urlStatus;
    
    if(imageURL.startsWith('data:image/')) {
      //For Online DataURL(Base64)
      const arrayBuffer = convertDataURL_toArrayBuffer(imageURL);
      const imageData = new Uint8Array(arrayBuffer)
      bodyContent = imageData;
      imageContentType = "application/octet-stream";
    }
    else {
      //For actual HTML-URL
      bodyContent = { url: imageURL };
      imageContentType = "application/json";
    }
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

function convertDataURL_toArrayBuffer(dataURL) {
  
  const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, ''); //Remove Starting Data-Headers
  const byteChars = atob(base64Data); //Decode Base64
  
  let byteNumbers = new Array(byteChars.length); //Create EmptyArray
  for (let i = 0; i < byteChars.length; i++)
    byteNumbers[i] = byteChars.charCodeAt(i); //Copy BinaryData into Array
  
  return byteNumbers;
}

async function checkURLValidity(imageURL) {
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
  
  return "Valid";
}
