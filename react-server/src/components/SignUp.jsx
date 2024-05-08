import React, { useState,  useEffect} from "react";
import {useNavigate, Link, Navigate} from "react-router-dom";
import {doCreateUserWithEmailAndPassword} from '../firebase/FirebaseFunctions.js';
import SocialSignIn from './SocialSignIn.jsx';
import {db} from '../firebase/FirebaseFunctions';
import {setDoc, doc} from 'firebase/firestore';
import {getAuth} from 'firebase/auth';


function SignUp() {
    const auth = getAuth();
    const navigate = useNavigate();
    const [errors, setErrors] = useState([]);

    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [repeat_password, setRepeatPassword] = useState("");

    const [strength, setStrength] = useState("weak");
    const [match, setMatch] = useState(false);

    const [email, setEmail]=useState(null);

    const {currentUser} = getAuth()

    useEffect(()=>
  {
    if (currentUser) {
      navigate('/')
      return
  }

  },[])
  

    function handlePwdChange(e) {
        let newPwd = e.target.value;
        setPassword(newPwd);
        validatePassword(newPwd);
    }

    function validatePassword(password) {
        const hasUpperCase = /[A-Z]/g.test(password);
        const hasLowerCase = /[a-z]/g.test(password);
        const hasNumber = /[0-9]/g.test(password);
        const hasSpecialChar = /[!@#$%^&*()]/g.test(password);

        if (password.length < 8) {
            setStrength("weak");
        } else if (hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar) {
            setStrength("strong");
        } else {
            setStrength("medium");
        }
        return;
    }

    function handleRePwdChange(e) {
        let newPwd = e.target.value;
        setRepeatPassword(newPwd);
        setMatch(password === newPwd);
    }

    if (currentUser) {
        return <Navigate to='/home'/>;
    }
    let userCreated = null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors([]);

        if (password !== repeat_password) {
            setErrors((prevState) => {
                return [...prevState, "Passwords don't match"];
            });

        }

        if (!errors.length) {

            try {
                await doCreateUserWithEmailAndPassword(
                    email,
                    password
                );
                userCreated = auth.currentUser;

                if (userCreated) {
                    setLoading(true)
                    const userDocRef = doc(db, "users", userCreated.uid);
                    await setDoc(userDocRef, {
                        id: userCreated.uid,
                        firstName: "",
                        lastName: "",
                        email: email.trim(),
                        dob: "",
                        gender: "",
                        phoneNumber: "",
                        languages: [],
                        friends: [],
                        profilePictureLocation: ""
                    });

                    await setDoc(doc(db, "userchats", userCreated.uid), {
                        chats: [],
                    });

                    let response = await fetch("http://localhost:4000/user/createuserwithemail", {
                        method: "POST",
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            uId: userCreated.uid,
                            email: email.trim(),
                            password: password,
                        })
                    });
                    let data = await response.json();
                    if (!response.ok) {
                        if (data && data.message) {
                            setErrors((prevState) => {
                                return [...prevState, data.message];
                            });
                        } else {
                            setErrors((prevState) => {
                                return [...prevState, "An error occurred while signing up"];
                            });
                        }
                    } else {
                        setErrors([])
                        setLoading(false);
                        //setContinuePage(true);
                        navigate('/home');
                        return
                    }
                } else {
                    navigate('/home');
                }
            } catch (e) {
                setErrors((prevState) => {
                    return [...prevState, e.message];
                });
                alert("You can finish the application on home page... Have fun!!!")
                navigate('/home');
            }
            setLoading(false)
            return;
        }
        return
    }
        if (loading) {
            return <div>loading..</div>
        }

    return (
        <div className="max-w-md mx-auto my-8">
                <div>

                    <div className='card'>
                        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                            <h2 style={{textAlign: "center", fontWeight: "bold"}}>Create a new profile</h2>
                            <div className="mb-4">
                                <label
                                    htmlFor="email"
                                    className="block text-gray-700 text-sm font-bold mb-2">
                                    Email:
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={email}
                                    required
                                    onChange={(e)=>setEmail(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>
                            <div className="mb-4">
                                <label
                                    htmlFor="password"
                                    className="block text-gray-700 text-sm font-bold mb-2">
                                    Password:
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    required
                                    onChange={handlePwdChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                                {password && (
                                    <span
                                        style={
                                            strength === "weak"
                                                ? {color: "red"}
                                                : strength === "medium"
                                                    ? {color: "orange"}
                                                    : {color: "green"}
                                        }>
                {strength}
              </span>
                                )}
                            </div>
                            <div className="mb-4">
                                <label
                                    htmlFor="repeat_password"
                                    className="block text-gray-700 text-sm font-bold mb-2">
                                    Confirm Password:
                                </label>
                                <input
                                    type="password"
                                    name="repeat_password"
                                    value={repeat_password}
                                    required
                                    onChange={handleRePwdChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                                {repeat_password && (
                                    <span style={match ? {color: "green"} : {color: "red"}}>
                {match ? "Passwords Match" : "Passwords doesn't Match"}
              </span>
                                )}
                            </div>
                            {errors.length > 0 && <ul>
                                {errors.map((error) => (
                                    <li key={error} style={{color: "red"}}>
                                        {error}
                                    </li>
                                ))}
                            </ul>}
                            <div className="flex justify-between items-center">
                                <button
                                    className="bg-blue-500 hover:bg-blue-700 text-black font-bold py-2 px-2 rounded focus:outline-none focus:shadow-outline"
                                    id='submitButton'
                                    name='submitButton'
                                    type='submit'
                                >
                                    Continue
                                </button>

                                <Link to="/signin">
                                    <button
                                        className="bg-gradient-to-r from-green-500 to-green-700 hover:bg-gradient-to-l from-green-700 to-green-500 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-lg shadow-green-500/50">
                                        Already have an account
                                    </button>

                                </Link>
                            </div>
                        </form>
                        <br/>

                        <SocialSignIn/>

                    </div>
                </div></div>
)}
export default SignUp;