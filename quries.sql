CREATE TABLE Authentications (
    name VARCHAR(50) NOT NUll,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO Authentications VALUES('test','test@gmail.com','123');