'use client'

import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc,getDocs, addDoc,updateDoc,deleteDoc, } from 'firebase/firestore';
import {Camera} from "react-camera-pro";
import { db } from './firebase';

import { getImageLabels } from './actions';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer"

//Potential New Features to Implement
// User Autentication (Clerk Auth)
// Search and Filter
// Pagination
// More Item Deatils
// Item Categories (using Machine Learning)
// Add Items using Images (using Machine Learning)
// Data Export in csv or pdf
// Mobile Responsiveness


export default function Home() {

  const [newItem, setnewItem] = useState({name:'', qty:''});
  const [inventory, setInventory] = useState([
    { id:1, name: "Temp Item1", qty: 3},
    { id:2, name: "Temp Item2", qty: 7},
  ]);
  
  const [response, setResponse] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [detectedItems, setDetectedItems] = useState([]);
  
  useEffect(() => {
    const updateInventory = async () => {
      try {
        const docs = await getDocs(collection(db, 'inventory'));
        
        const inventoryList = [];
        docs.forEach((doc) => {
          let item = { id:doc.id, name:doc.data().name, qty:doc.data().qty};
          inventoryList.push(item);
        })
        setInventory(inventoryList);
      }
      catch (error) {
        console.error('Error Retreiving Items from Database: ', error);
      }
    }
    
    updateInventory();
  }, []);

  const handleAddNewItem = async (e) => {
    e?.preventDefault();

    if (newItem.name.trim() === '') {
      return; //No Item Name Entered
    } 
    if(newItem.qty==='')
      newItem.qty = 1; //Default Qty.  
    

    //Item already Exists
    if(inventory.some((item) => item.name === newItem.name)) {
      try {
        let temp = [...inventory];
        let index = temp.findIndex((i) => i.name === newItem.name);
        temp[index] = { ...temp[index], qty: parseInt(temp[index].qty) + parseInt(newItem.qty) };
        
        const itemQty = temp[index].qty;
        const docId = temp[index].id;
        
        setInventory(temp);
        await updateDoc(doc(db, 'inventory', docId), { qty: itemQty });
        setnewItem({name:'', qty:''});
      }
      catch(error) {
        console.error('Error Updating Item Quantity: ', error);
      }
    }
    //Add New Item
    else {
      
      try {
        const docRef = await addDoc(collection(db, 'inventory'), newItem);
        console.log('Document written with ID: ', docRef.id);
        setInventory([...inventory, {id:docRef.id, ...newItem}]);
        setnewItem({name:'', qty:''});
      }
      catch (error) {
        console.error('Error Adding New Item: ', error);
      }
    }
  };
  
  const handleItemIncrement = async (itemName) => {
    try {
      let temp = [...inventory];
      let index = temp.findIndex((i) => i.name === itemName);
      temp[index] = { ...temp[index], qty: temp[index].qty + 1 };
      
      const itemQty = temp[index].qty;
      const docId = temp[index].id;

      setInventory(temp);
      await updateDoc(doc(db, 'inventory', docId), { qty: itemQty });
    }
    catch(error) {
      console.error('Error Updating Item Quantity: ', error);
    }
  };
  
  const handleItemDecrement = async (itemName) => {
    try {
      let temp = [...inventory];
      let index = temp.findIndex((i) => i.name === itemName);
      temp[index] = { ...temp[index], qty: temp[index].qty - 1 };
      
      const itemQty = temp[index].qty;
      const docId = temp[index].id;

      if(itemQty>0) {
        setInventory(temp);
        await updateDoc(doc(db, 'inventory', docId), { qty: itemQty });
      }
      else {
        temp.splice(index, 1);
        setInventory(temp);
        await deleteDoc(doc(db, 'inventory', docId));
      }
    }
    catch(error) {
      console.error('Error Updating Item Quantity: ', error);
    }   
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between sm:p-24 p-4 bg-slate-900 text-slate-100">
      <div className="max-w-5xl w-full items-center justify-between font-mono text-s">
        <h1 className="text-4xl p-4 text-center">AI Inventory Management</h1>
        
        <div className="bg-slate-700 rounded-xl p-8">
          
          <div className="mb-6 pb-4 border-b border-slate-500" >
            <form className='inline-block' onSubmit={handleAddNewItem}>
              <input className="rounded-md bg-slate-600 py-1 px-3 mr-1 w-52 my-2"
                placeholder="Enter Item Name"
                type="text"
                value={newItem.name}
                onChange={(e) => setnewItem({...newItem, name:e.target.value})}
              />
              <input className="rounded-md bg-slate-600 py-1 px-3 mr-1 w-20 my-2"
                placeholder="Qty."
                type="number"
                value={newItem.qty}
                onChange={(e) => setnewItem({...newItem, qty:e.target.value})}
              />
              <button className="border border-black bg-slate-900 py-1 px-2 mr-1 rounded-md text-slate-300" type="submit">Add Item</button>
            </form>
            
            <span className='mx-2'>OR</span>
            <Drawer onClose={() => { setResponse(''); setDetectedItems([]); }}>
              <DrawerTrigger className="border border-black bg-slate-900 py-1 px-2 mr-1 rounded-md text-slate-300">Camera</DrawerTrigger>
              <DrawerCameraScreen />
            </Drawer>

            <span className='mx-2'>OR</span>
            <Drawer onClose={() => { setResponse(''); setDetectedItems([]); } }>
              <DrawerTrigger className="border border-black bg-slate-900 py-1 px-2 mr-1 rounded-md text-slate-300">Upload</DrawerTrigger>
              <DrawerUploadImage />
            </Drawer>
          </div>
          
          <ul id="inventory-items">
            {inventory.map((item, id) => (
              <li key={id} className="my-2 flex">
                <span className="w-56 content-center">{item.name}</span>
                <span className="w-20 content-center">{item.qty}</span>
                <button className="border border-black bg-slate-900 w-7 h-7 px-2 mx-1 rounded-md text-slate-300" onClick={() => handleItemIncrement(item.name)}>+</button>
                <button className="border border-black bg-slate-900 w-7 h-7 px-2 mx-1 rounded-md text-slate-300" onClick={() => handleItemDecrement(item.name)}>-</button>
              </li>
            ))}
            
            {!inventory.length && (
              <p className="text-slate-400">Currently, No items in the Inventory...</p>
            )}
          </ul>
  
        </div>

      </div>
    </main>
  );

  
  /* Components */
  
  function handleChosenItem(itemName) {
    newItem.name = itemName.charAt(0).toUpperCase() + itemName.slice(1); //Capitalize Word
    handleAddNewItem();
  };

  function DrawerUploadImage() {
    
    const formDataRef = useRef(null);
    
    const handleImageInput = async (formData) => {
      setResponse('Waiting...'); //This is not Working
      const result = await getImageLabels(formData);
      if(typeof(result)==='string')
        setResponse(result); //Some kind of Error
      else {
        //Actual Result
        setResponse(result.captionText + "\n Choose your Items...");
        setDetectedItems(result.items);
      }
      
      formDataRef.current.reset();
    };
    
    return (
      <DrawerContent className="bg-slate-800 text-slate-100">
        <DrawerHeader className="mb-8 p-8 sm:p-10">
          <DrawerTitle className="text-slate-300 mb-2">Get some Inventory Item's Image Online or Upload from Device</DrawerTitle>
          <form action={handleImageInput} ref={formDataRef}>
            <input className="rounded-md bg-slate-600 px-2 py-1 w-5/6 my-2 block"
              placeholder="Paste Image URL"
              type="text"
              name='imageURL'
            />
            <span>OR</span>
            <input className="rounded-md bg-slate-600 pr-2 mx-4 w-80 mb-6 text-slate-200"
              type="file"
              name='imageFile'
              accept="image/*"
            />
            <button className="border border-black bg-slate-900 py-2 px-4 rounded-md text-slate-300" type='submit'>Get Response</button>
          </form>

          <pre className="mt-2">{response}</pre>

          <ul className='flex flex-wrap'>
            {detectedItems.map((item, id) => (
              <li key={id} className="my-2 px-2 py-1 mx-1 border-2 rounded-lg border-slate-300 text-slate-200">
                <DrawerClose onClick={() => handleChosenItem(item)}>
                  {item}
                </DrawerClose>
              </li>
            ))}
          </ul>

        </DrawerHeader>
      </DrawerContent>  
    );
  }
  
  function DrawerCameraScreen() {
    
    const camera = useRef(null);
    
    const captureImage = async () => {
      const imageSrc = camera.current.takePhoto();
      setShowCamera(false);
      setResponse('Waiting...');
      const result = await getImageLabels(imageSrc);
      if(typeof(result)==='string')
        setResponse(result); //Some kind of Error
      else {
        //Actual Result
        setResponse(result.captionText + "\n Choose your Items...");
        setDetectedItems(result.items);
      }
    };

    const handleOpenCamera = () => {
      setShowCamera(true);
      setResponse('');
    };

    return (
      <DrawerContent className={`bg-slate-800 text-slate-100 ${showCamera ? "h-full":"h-2/5"} `}>
        <DrawerHeader className="inline-block p-8 sm:p-10">
          <DrawerTitle className="text-slate-300 mb-2">Take an Image of Inventory Items with your Device Camera</DrawerTitle>
          <button className="border border-black bg-slate-900 py-1 px-2 mr-1 rounded-md text-slate-300" onClick={handleOpenCamera}>Open Camera</button>

          {showCamera && (
            <div>
              <Camera ref={camera}/>
              <div className='absolute bottom-10 left-[40%] right-[40%] text-center'>
                <button className='border-4 border-slate-900 bg-slate-200 rounded-full w-12 h-12' onClick={captureImage}></button>
              </div>
              <DrawerClose className='absolute top-4 left-[38%] right-[38%] border border-slate-900 bg-slate-800 py-1 px-2 rounded-md' onClick={() => setShowCamera(false)}>
                Close
              </DrawerClose>
            </div>
          )}
          
          <pre className="mt-2">{response}</pre>

          <ul className='flex flex-wrap'>
            {detectedItems.map((item, id) => (
              <li key={id} className="my-2 px-2 py-1 mx-1 border-2 rounded-lg border-slate-300 text-slate-200">
                <DrawerClose onClick={() => handleChosenItem(item)}>
                  {item}
                </DrawerClose>
              </li>
            ))}
          </ul>

        </DrawerHeader>
      </DrawerContent>
    );
  }

}
