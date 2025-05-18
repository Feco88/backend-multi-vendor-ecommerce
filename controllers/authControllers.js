const adminModel = require('../models/adminModel')
const sellerModel = require('../models/sellerModel')
const sellerCustomerModel = require('../models/chat/sellerCustomerModel')
const { responseReturn } = require('../utilities/response')
const bcrypt = require('bcrypt')
const { createToken } = require('../utilities/tokenCreate')
const cloudinary = require('cloudinary').v2
const formidable = require("formidable")

class authControllers{
    admin_login = async(req,res) => {
        const {email,password} = req.body
        try {
            const admin = await adminModel.findOne({email}).select('+password')
            // console.log(admin)
            if (admin) {
                const match = await bcrypt.compare(password, admin.password)
                // console.log(match)
                if (match) {
                    const token = await createToken({
                        id : admin.id,
                        role : admin.role
                    })
                    res.cookie('accessToken',token, {
                        expires : new Date(Date.now() + 7*24*60*60*1000)
                })
                responseReturn(res,200,{token, message: "Sikeres bejelentkezés"})
                } else {
                    responseReturn(res,404,{error: "A megadott jelszó érvénytelen!"})
                }
            } else {
                responseReturn(res,404,{error: "Email cím nem található!"})
            }
        } catch (error) {
            responseReturn(res,500,{error: error.message})
        }
    }
//admin_login metódus vége
//eladói bejelentkezés metódus kezdete
seller_login = async(req,res) => {
    const {email,password} = req.body
    try {
        const seller = await sellerModel.findOne({email}).select('+password')
        // console.log(admin)
        if (seller) {
            const match = await bcrypt.compare(password, seller.password)
            // console.log(match)
            if (match) {
                const token = await createToken({
                    id : seller.id,
                    role : seller.role
                })
                res.cookie('accessToken',token, {
                    expires : new Date(Date.now() + 7*24*60*60*1000)
            })
            responseReturn(res,200,{token, message: "Sikeres bejelentkezés"})
            } else {
                responseReturn(res,404,{error: "A megadott jelszó érvénytelen!"})
            }
        } else {
            responseReturn(res,404,{error: "Email cím nem található!"})
        }
    } catch (error) {
        responseReturn(res,500,{error: error.message})
    }
}
//eladói bejelentkezés metódus vége

//eladói regisztrációs metódus eleje
seller_register = async(req, res) => {
    const {email,name,password} = req.body
     try {
//Email cím alapján keresse meg, hogy
        const getUser = await sellerModel.findOne({email})
//Ha az email cím létezik, akkor írja ki a következőt:
        if (getUser) {
            responseReturn(res,404,{error: 'A megadott email cím már létezik'})
//Ha nincs megadott email cím, akkor szúrja be az adatbázisba az adatokat
        } else {
            const seller = await sellerModel.create({
                name,
                email,
                password: await bcrypt.hash(password,10),
                method : 'manually',
                shopInfo: {}
            })
            await sellerCustomerModel.create({
                myId: seller.id
            })
            const token = await createToken({
                id: seller.id, role: seller.role
            })
            res.cookie('accessToken',token, {
                expires: new Date(Date.now() + 7*24*60*60*1000)
            })

            responseReturn(res,201,{token,message: 'Sikeres regisztráció'})
        }
         } catch (error) {
            responseReturn(res,500,{error: 'Belső szerverhiba'})
     }
 }
//eladói regisztrációs metódus vége

getUser = async(req,res) => {
    const {id, role} = req;
    try {
        if (role === 'admin') {
            const user = await adminModel.findById(id)
            responseReturn(res, 200, {userInfo : user})
        } else {
            const seller = await sellerModel.findById(id)
            responseReturn(res, 200, {userInfo : seller})
        }
    } catch (error) {
        responseReturn(res,500,{error: 'Belső szerverhiba'})
    }
}
// getUser metódus vége
// profilkép feltöltése metódus eleje
    profile_image_upload = async(req,res) => {
        const {id} = req;
        const form = formidable({ multiples: true })
        form.parse(req,async(err,_,files) => {
            cloudinary.config({
            cloud_name: process.env.cloud_name,
            api_key: process.env.api_key,
            api_secret: process.env.api_secret,
            secure: true
            })
            const { image } = files

        try {
        const result = await cloudinary.uploader.upload(image.filepath,{folder:'profile'})
        if (result) {
            await sellerModel.findByIdAndUpdate(id, {image: result.url})
            const userInfo = await sellerModel.findById(id)
            responseReturn(res,201,{ message: 'Profilkép sikeresen módosítva!',userInfo})
        } else {
            responseReturn(res,404,{error: 'Profilkép feltöltése sikertelen!'})
        }
        } catch (error) {
            responseReturn(res,500,{error: error.message})
        }
        })
    }
// profilkép feltöltése metódus vége
// Eladói boltinformáció metódus eleje
profile_info_add = async (req, res) => {
    const { division,district,shopName,sub_district } = req.body;
    const {id} = req;

    try {
     await sellerModel.findByIdAndUpdate(id, {
        shopInfo: {
            shopName,
            division,
            district,
            sub_district
        }
    })
     const userInfo = await sellerModel.findById(id)
     responseReturn(res, 201,{ message : 'Profiladatok sikeresen módosítva!',userInfo})

    } catch (error) {
     responseReturn(res, 500,{ error : error.message })
    }
 }
// Eladói boltinformáció metódus vége
//Kijelentkeztető metódus
logout = async(req,res) => {
    try {
     res.cookie('accessToken',null,{
        expires: new Date(Date.now()),
        httpOnly: true
     })
     responseReturn(res, 200, {message: 'Sikeres kijelentkezés'})
    } catch (error) {
     responseReturn(res, 500,{ error : error.message })
    }
}
//Kijelentkeztető metódus vége
//Eladó - jelszó megváltoztatása metódus
change_password = async(req,res) => {
 const {email, old_password, new_password} = req.body;
  //console.log(email, old_password, new_password)
  try {
//keresett felhasználói adatok (email + a jelszó select-ben, hogy ne jelenjen meg az utóbbi)
   const user = await sellerModel.findOne({email}).select('+password')
   //ha nem létező felhasználó szeretne jelszót változtatni
    if (!user) return res.status(404).json({message:'E-mail cím nem található'})
   //ha létező felhasználóról van szó, akkor összehasonlítjuk a régi jelszót
   //az általa megadott régi jelszóval
   const isMatch = await bcrypt.compare(old_password, user.password)
    if (!isMatch) return res.status(400).json({message:'Hibás jelszót adtál meg'})
    //új felhasználói jelszó titkosítása
    user.password = await bcrypt.hash(new_password,10)
    //új jelszó elmentése az adatbázisba
    await user.save()
     res.json({message: 'Jelszó sikeresen módosítva'})

  } catch (error) {
     res.status(500).json({message: 'Szerverhiba!'})
    }
}
//Eladó - jelszó megváltoztatása metódus vége
}
module.exports = new authControllers()