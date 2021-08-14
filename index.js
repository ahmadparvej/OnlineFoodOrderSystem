/* Index.js  */
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const hbs = require('hbs');
const multer = require('multer');
const validator = require('email-validator');
const nodemailer = require('nodemailer');
const Datastore = require('nedb');
const fs = require('fs');
const Razorpay = require('razorpay');
const crypto = require("crypto");
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);
const port = 5000
require('dotenv').config();

db = {};
db.users = new Datastore('users.db');
db.fooddata = new Datastore('fooddata.db');
db.empdata = new Datastore('empdata.db');
db.cart = new Datastore('cart.db');
db.history = new Datastore('history.db');
db.otp = new Datastore('otp.db');
db.comment = new Datastore('comment.db');
db.admin = new Datastore('admin.db');
db.temp = new Datastore('temp.db');
db.users.loadDatabase();
db.fooddata.loadDatabase();
db.empdata.loadDatabase();
db.cart.loadDatabase();
db.history.loadDatabase();
db.otp.loadDatabase();
db.comment.loadDatabase();
db.admin.loadDatabase();
db.temp.loadDatabase();
db.otp.ensureIndex({ fieldName:'createdAt',expireAfterSeconds:300});

var instance = new Razorpay({
	key_id: process.env.key_id,
	key_secret: process.env.key_secret
});

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.set('views', './public');
app.use(express.static(__dirname + '/public'));
app.use((req, res, next) => {
	res.set('Cache-Control', 'no-store')
	next()
});

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null,path.join(__dirname, './public/upload'))
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

hbs.registerHelper('json', function(context) {             
	  return JSON.stringify(context);                                
});

const  logger = function (req, res, next) {
db.users.findOne({email:req.cookies.email}
,function(err,data)         {                             if((validator.validate(req.cookies.email))
 && (req.cookies.email !== undefined) && (req.cookies.email === data?.email))                               {                                                 next();
        }                                                 else                                              {
        res.redirect('/login');
        }                                                 });
};

const adminlogger = function(req,res,next){
  db.admin.findOne({admin:req.cookies.admin},function(err,data)                                    
	{                                                  if((req.cookies.admin !== undefined) && (req.cookies.admin === data?.admin) && (req.cookies.id === data?.id))                                       {                                                  next();
       }
     else                                              {                                                 res.redirect('/admin');
     }
     });
}

function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

      const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER,
      port: 587,
     secure: false, // true for 465, false for other ports
      auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS 
     },
     });

function mail(email)
{
otpdata = makeid(8);
db.otp.insert({email:email,createdAt:new Date(),otp:otpdata});
let body = { 
	  from:process.env.EMAIL_USER,
	    to:email,
	subject:'FoodOrderMangement otp',
           html: "<h1>Your secret otp for account recovery is :-  <h1>"+otpdata+"<br>"+"<p>Note otp valid for 5 minutes only</p>"
            };

transporter.sendMail(body,(err,data)=>{
	if(err)
	{
	console.log(err);
	return false;
	}
	console.log(data);
});
}

app.get('/',(req, res) => {                              
	res.redirect('/login');
});

app.get('/login',(req, res) => {
	db.users.findOne({email:req.cookies.email},function(err,data)         {
        if((validator.validate(req.cookies.email)) && (req.cookies.email !== undefined) && (req.cookies.email === data?.email))
        {         
	res.redirect('/home');             
	}                               
	else                                
	{
	res.render('userlogin.html',{value:false});	
	}
	});
});

app.post('/login',(req, res) => {
	let email = req.body.email;
	let password = req.body.password;
	db.users.findOne({email:email,password:password},function(err,data){
        if((validator.validate(email)) && (data?.email === email) && (data?.password === password))      {           
        res.cookie('email',email,{path:'/',httpOnly:true});
	res.cookie('username', data.username,{path:'/',httpOnly:true});
	res.redirect('/home');   
        }                              
        else
        {    
	     res.render('userlogin.html',{value:true});
        }
});
});

app.get('/signup',(req, res) => {    	
	db.users.findOne({email:req.cookies.email}
,function(err,data)         {
        if((validator.validate(req.cookies.email)) && (req.cookies.email !== undefined) && (req.cookies.email === data?.email))
        {                                                 res.redirect('/home');
        }
        else
        {             
	res.render('usersignup.html',{value1:false,value2:false});
	}                                                 });
});

app.post('/signup',(req, res) => {
         let email = req.body.email;
	 let username = req.body.username;
	 let password = req.body.password;
	 let contact = req.body.contact;
	db.users.findOne({email:email},function(err,data){
        if((validator.validate(email)) && (data?.email !== email))
          {
       let userdata ={email:email,username:username,password:password,contact:contact}
	   db.users.insert(userdata, function(err,data)
	  {       
	   res.cookie('email',email,{path:'/',httpOnly:true});        
           res.cookie('username', username,{path:'/',httpOnly:true});
	   res.redirect('/home')
	  });
          }
      else if ((data?.email === email) && (data?.email !== undefined))
          {
	   res.render('usersignup.html',{value1:true,value2:false});
          }
	  else 
	  {
           res.render('usersignup.html',{value1:false,value2:true});
	  }

});
});
app.get('/emplogin',(req, res) => {
	db.empdata.findOne({empid:req.cookies.empid},function(err,data){
        if((req.cookies.empid !== undefined) && (req.cookies.empid === data?.empid))
        {
        res.redirect('/panel');    
	}
        else
        {                                                    
	res.render('emplogin.html',{value:false});
	} 
	});
});

app.post('/emplogin',(req,res)=> {
empid = req.body.empid;
password = req.body.password;
db.empdata.findOne({empid:empid,password:password},function(err,data)
{                         
  if((data?.empid === empid) && (data?.password === password))       
  {      
res.cookie('empid',empid,{path:'/',httpOnly:true});                  
res.cookie('empname',data.empname,{path:'/',httpOnly:true});         
res.redirect('/panel');     
}      
else 
{    
  res.render('emplogin.html',{value:true});                      
}            	
});
});

app.get('/home',logger,(req,res)=> {
        db.fooddata.find({},(err,data)=>{
	res.render('home.html',{data:data});
        });
});

app.post('/foodinfo',logger,(req,res)=> {
       db.fooddata.findOne({name:req.body.name},(err,data1)=>{
	      db.comment.find({name:req.body.name},(err,data2)=>{
		      db.history.findOne({email:req.cookies.email,orderstatus:"delevered",name:req.body.name},function(err,data3){
res.render('foodinfo.html',{data:data1,comments:data2,email:req.cookies.email,data3:data3});
			});
	       });
       });
});

app.post('/comment',logger,(req,res)=> {
	db.comment.insert(req.body,(err)=>{
	  db.comment.find({name:req.body.name},(err,data)=>{
		res.send(JSON.stringify(data));
});
});
});

app.post('/addtocart',logger,(req, res) => {
	db.fooddata.findOne({name:req.body.name},(err,data) => {
	db.cart.insert({name:req.body.name,price:data.price,quantity:req.body.quantity,email:req.body.email,username:req.cookies.username,type:data.type,custom:req.body.custom});
	res.redirect('/cart');
	});

});

app.get('/cart',logger,(req,res)=> {
	db.cart.find({email:req.cookies.email},(err,data)=>{
res.render("cart.html",{cart:data});
	});
});

app.post('/remove',logger,(req,res)=> {
	db.cart.remove(req.body,{},(err)=>{
        db.cart.find({email:req.body.email},(err,data)=>{
	res.send(JSON.stringify(data));
	})
	});
});

app.get('/profile',logger,(req,res)=> {
	db.history.find({email:req.cookies.email},{email:0,username:0,_id:0}).sort({date:-1}).exec((err,data)=>{
	res.render('profile.html',{data:data,userid:{username:req.cookies.username,email:req.cookies.email}});
        });
});
app.post('/search',logger,(req,res)=> {
        db.fooddata.find( {name: new RegExp(req.body.search,'i')},(err,data)=>{
	res.render('search.html',{data:data});
        });                             
});

app.get('/chatbot',logger,(req, res)=>{ 
      db.fooddata.find({},(err,data1)=>{
      data2 = {username:req.cookies.username,email:req.cookies.email};
      res.render('chatbot.html',{fooddata:data1,userdata:data2});
      }); 
  });

app.get('/forgotpsw',(req,res)=> {
   db.users.findOne({email:req.cookies.email},function(err,data)
        {    
          if((validator.validate(req.cookies.email)) && (req.cookies.email !== undefined) && (req.cookies.email === data?.email))
          {     
            res.redirect('/home');
          }      
          else                
          {
        res.render('forgotpsw.html',{data:false});
	}
	});
});

app.post('/forgotpsw',(req,res)=> {
	db.users.findOne({email:req.body.email},(err,data)=>{
	if(data === null)
	{
	res.render('forgotpsw.html',{data:true});
	}
	else
	{
	mail(req.body.email)
	res.redirect(307,'/otp');
	}
	});
});

app.post('/otp',(req,res)=>{
        res.render('otp.html',{data:false});
});

app.post('/otpdata',(req,res)=>{
	db.otp.findOne({otp:req.body.otp},(err,data)=>{
	if(data === null)
	{ res.render('otp.html',{data:true});}
	else
	{
	let val = makeid(12);
	db.temp.insert({email:data.email,val:val});
	res.cookie('val',val,{path:'/',httpOnly:true,maxAge:1800000});
        res.render('newpsw.html',{email:data.email});
	}
	});
});

app.post('/newpsw',(req,res)=>{
	db.temp.findOne({email:req.body.email},(err,data)=>{
	if(req.cookies.val === data.val)
	{
	db.temp.remove({email:req.body.email});
	db.users.update({email:req.body.email},{$set:{password:req.body.password}},{multi:false});
	res.render('complete.html');
	}
      else
     res.redirect('/login');
});
});


app.get('/admin',(req,res)=> {
      db.admin.findOne({admin:req.cookies.admin},function(err,data)   
     {   
       if((req.cookies.admin !== undefined) && (req.cookies.admin === data?.admin) && (req.cookies.id === data?.id))  
     {                             
       res.redirect('/admindashboard');
     }                           
     else                             
     {  
     res.render('adminlogin.html',{value:false});                      
     }                               
     });
});

app.post('/admin',(req,res)=> {
        let admin = req.body.admin;
        let password = req.body.password;
        db.admin.findOne({admin:admin,password:password},function(err,data)
        {                     
          if((data?.admin === admin) && (data?.password === password))          {
        id = makeid(15);
	db.admin.update({admin:admin},{'$set' : {id:id}},{multi:false});
     res.cookie('admin',admin,{path:'/',httpOnly:true,maxAge:1800000});  
	 res.cookie('id', id,{path:'/',httpOnly:true,maxAge:1800000})
;       res.redirect('/admindashboard');
        }
        else
        {                     
          res.render('adminlogin.html',{value:true});     
        }        
        });
});

app.get('/admindashboard',adminlogger,(req,res)=> {
	res.render('admindashboard.html',{data:false});
});

app.get('/removeuser',adminlogger,(req,res)=> {
	res.render('removeuser.html',{value:false});
});

app.post('/removeuser',adminlogger,(req,res)=> {
	db.users.findOne({email:req.body.email},(err,data)=>{
	  if( data !== null )
	 {
         db.users.remove({email:req.body.email});
         db.cart.remove({email:req.body.email},{ multi: true });
	 db.history.remove({email:req.body.email},{ multi: true });
	 res.render("done.html");
	 }
	 else 
	 {
	 res.render('removeuser.html',{value:true});
	 }
	});
});

app.get('/removeemployee',adminlogger,(req,res)=> {
	res.render('removeemployee.html',{value:false});
});

app.post('/removeemployee',adminlogger,(req,res)=> {
	db.empdata.findOne({empid:req.body.empid},(err,data)=>{             
	  if( data !== null )           
	  {      
	    db.empdata.remove({empid:req.body.empid});
	res.render('done.html'); 
	}
	else
        {
        res.render('removeemployee.html',{value:true});
        }
        });
});

app.get('/createemployee',adminlogger,(req,res)=> {
	res.render('createemployee.html',{value:false});
});

app.post('/createemployee',adminlogger,(req, res) => {
	let empid = req.body.empid;
	let empname = req.body.empname;
	let password = req.body.password; 
	db.empdata.findOne({empid:empid},function(err,data)
	{                 
	  if((data?.empid !== empid))
	{
        let empdata ={empid:empid,empname:empname,password:password}
	db.empdata.insert(empdata,function(err,data){
	res.render('done.html');
	});
	}
  else                                  
	{     
	  res.render('createemployee.html',{value:true});        
	}           
	});                            
	});

app.get('/logout', (req, res)=>{ 
     res.clearCookie('email'); 
     res.clearCookie('username')
     res.redirect('/login')

});

app.get('/emplogout',(req,res)=>{
    res.clearCookie('empname');
    res.clearCookie('empid');
    res.redirect('/login');
});

app.get('/adminlogout',(req,res)=>{
    res.clearCookie('admin');
    res.clearCookie('id');
    res.redirect('/login');
});

app.get('/upload',adminlogger,(req, res)=>{
        res.render('upload.html');
});

app.post('/upload', upload.single('img'),(req, res)=>{
	try
	{
	name = req.body.name;
	type = req.body.type;
	img = req.file.filename;
	price = req.body.price;
	custom = req.body.custom;
	db.fooddata.insert({name:name,type:type,img:img,price:price,custom:custom});
	res.render("done.html");
	}
	catch(e)
	{
		res.send("<h1 style='color:red'>"+"SOME ERROR OCCURRED!"+"</h1>")
	}
});

app.get('/orderhistory',(req,res)=>{
	db.empdata.findOne({empid:req.cookies.empid},(err,data)=>             {
	if((req.cookies.empid !== undefined) && (req.cookies.empid === data?.empid))
        {
	db.history.find({orderstatus:{$in:["delevered"]}},{_id:0}).sort({date:-1}).exec((err,data)=>{
	res.render('orderhistory.html',{data:data});
	});
	}
	else
	{
	res.redirect('/emplogin');
	}
	});

});

app.get('/updateadmin',adminlogger,(req,res)=>{
	res.render('updateadmin.html',{value:false});
});

app.get('/foodremove',adminlogger,(req,res)=>{
        res.render('removefood.html',{value:false});
});

app.post('/updateadmin',adminlogger,(req,res)=>{
	password = req.body.password;
	newpassword = req.body.newpassword;
	admin = req.body.admin;
	db.admin.findOne({password:password},(err,data1)=>{
	if(data1 === null)
	{
	res.render('updateadmin.html',{value:true});
	}
	else
	{
	db.admin.update({password:password},{ $set: {admin:admin,password:newpassword}},{multi:true});
	res.render('done.html');
	}
	});
});

app.post('/foodremove',adminlogger,(req,res)=>{
        foodname = req.body.name;
	db.fooddata.findOne({name:foodname},(err,data1)=>{
	if(data1 === null)
	{
	res.render('removefood.html',{value:true});
	}
	else
	{
	fs.unlink(path.join(__dirname, './public/upload/',data1.img), (err) => {
              if (err) {
              console.error(err)
              return } 
	      db.fooddata.remove({name:foodname});
	      console.log("Food removed successfully");
	      })
	res.render('done.html');
	}
	});
});

app.post('/placeorder',logger,(req,res)=> {
	var email = req.cookies.email;
	db.users.findOne({email:email},(err,data)=>{	
    contact = data.contact;
	username = data.name;
	address = req.body.address;
	let amount = 0;
	db.cart.find({email:email},(err,data)=>{	
	data.forEach(temp=>{
		amount += parseFloat(temp['price']);
	})
	var options = {
	  amount: amount*100,  // amount in the smallest currency unit
	  currency: "INR",
	};
	instance.orders.create(options, function(err, order) {
	if(order !== null)
	{
	res.render(
		  'payment',                                                          
		      {order_id:order.id,amount:order.amount,email:email,username:username,contact:contact,address:address,key:process.env.key_id}
		);
	}
	else
	{
		res.send("<h1 style='color:red'>"+"SOME ERROR OCCURRED!"+"</h1>")
	}
	})
})
})
});

app.post('/purchase',logger,(req,res) =>{
		var razorpay_payment_id = req.body.razorpay_payment_id;
		var razorpay_order_id = req.body.razorpay_order_id;
		var razorpay_signature = req.body.razorpay_signature;
		const hmac = crypto.createHmac('sha256',process.env.key_secret);
	
	hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
	let generatedSignature = hmac.digest('hex');
	
	let isSignatureValid = generatedSignature == razorpay_signature;   
		if(isSignatureValid)
		{
			console.log("successful transaction");
			db.cart.find({email:req.body.email},(err,data)=>{
				data.forEach(function (element) {
				element.address = req.body.address;
			element.orderstatus = "processing";
			element.payment_id = razorpay_payment_id;
			element.date = new Date();
				db.history.insert(element);
			});
			db.cart.remove({email:req.body.email},{ multi: true },function(){});
			});
			res.json({msg: "success"});
		}
		   else
		   {
		   console.log("unsuccessful transaction");
		   res.json({
				msg: "unsuccess"
			});
		   }
});


app.get('/panel',(req,res)=> {
	db.empdata.findOne({empid:req.cookies.empid},function(err,data)
	{                             
	  if((req.cookies.empid !== undefined) && (req.cookies.empid === data?.empid))         
	{
	res.render('panel.html');
	}
	else
	{
	res.redirect('/emplogin');
	}
});
});

io.on('connection',function(socket){
	console.log("A user connected");
	db.history.find({orderstatus:{$in:["processing","packed"]}},(err,data)=>{
		socket.emit('testerEvent',JSON.stringify(data));
	});
	socket.on("clientEvent",function(data){
		db.history.update({_id:data._id},{$set:{orderstatus:data.value}},{multi:false});
		db.history.find({orderstatus:{$in:['processing','packed']}},(err,data)=>{
			io.sockets.emit('broadcast',JSON.stringify(data));
		})
	})
	socket.on('disconnect',function(){
		console.log("A user disconnected")
	})
})

app.use(function(req, res, next){
    res.status(404).render('404_error_template', {title: "Sorry, page not found"});
});

server.listen(port, () => {
  console.log("listening at http://localhost:5000")
})
