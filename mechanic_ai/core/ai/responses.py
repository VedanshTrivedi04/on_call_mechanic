def greeting(language):
    if language == "HINDI":
        return "Namaste 🙂 Kripya apni vehicle problem bataiye."
    return "Hello 🙂 Please tell me your vehicle problem."

def polite_fallback(language):
    if language == "HINDI":
        return (
            "Yeh ek accha sawaal hai 🙂 "
            "Lekin main vehicle breakdown aur mechanic service ke liye bana hoon. "
            "Kripya apni problem bataiye."
        )
    return (
        "That’s a good question 🙂 "
        "I am designed to help with vehicle breakdown and mechanic services. "
        "Please tell me your issue."
    )
