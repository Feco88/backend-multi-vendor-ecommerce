const customerModel = require("../../models/customerModel")
const { responseReturn } = require("../../utilities/response")
const bcrypt = require("bcrypt")
const sellerCustomerModel = require("../../models/chat/sellerCustomerModel")
const {createToken} = require("../../utilities/tokenCreate")

class customerAuthController{
 customer_register = async(req,res) => {
  const {name,email,password} = req.body
  try {
    const customer = await customerModel.findOne({email})
    if (customer) {
      responseReturn(res,404,{error: 'A megadott e-mail cím már létezik!'})
    } else {
        const createCustomer = await customerModel.create({
         name: name.trim(),
         email: email.trim(),
         password: await bcrypt.hash(password, 10),
         method: 'manually'
       })
       await sellerCustomerModel.create({
        myId: createCustomer.id
       })
    //Token létrehozása
       const token = await createToken({
        id: createCustomer.id,
        name: createCustomer.name,
        email: createCustomer.email,
        method: createCustomer.method
       })
       //Token neve, lejárati ideje
       res.cookie('customerToken',token,{
        expires: new Date(Date.now() + 7*24*60*60*1000)
       })
       //Szerver válasza
       responseReturn(res,201,{message: "Sikeres vásárlói regisztráció",token})
    }
  } catch (error) {
     console.log(error.message)
  }
 }
 //Metódus vége
 customer_login = async(req,res) => {
    //e-mail cím és jelszó behasonlítása
     const { email,password } = req.body
     try {
      const customer = await customerModel.findOne({email}).select('+password')
      //jelszó párosítása az adatbázisban találhatóval
      if (customer) {
        const match = await bcrypt.compare(password, customer.password)
      //ha egyezik a jelszó, akkor készítsen token-t hozzá
        if (match) {
          const token = await createToken({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            method: customer.method
           })
           res.cookie('customerToken',token,{
            expires: new Date(Date.now() + 7*24*60*60*1000)
           })
           responseReturn(res,201,{ message: 'Sikeres bejelentkezés',token})
        } else {
          responseReturn(res,404,{ error: 'Érvénytelen jelszó'})
        }
      //ha nem egyezik a jelszó
      } else {
        responseReturn(res,404,{ error: 'E-mail cím nem található'})
      }
     } catch (error) {
      console.log(error.message)
     }
  }
//Metódus vége
//Vásárlói kijelentkezés metódus
customer_logout = async(req,res) => {
  //töröljük a customerToken cookie-t
  res.cookie('customerToken',"",{
    expires: new Date(Date.now())
  })
  responseReturn(res, 200, {message: 'Sikeres kijelentkezés'})
}
//Metódus vége
}

module.exports = new customerAuthController()