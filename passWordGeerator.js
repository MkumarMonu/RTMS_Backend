import bcrypt from "bcrypt"

const generatePassword = async () =>{
    const hashedOtp = await bcrypt.hash("Pushpalata@78", 10);
    console.log(hashedOtp);
}

generatePassword()