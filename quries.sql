-- CREATE QUERIES 
CREATE TABLE student_authentications (
    email VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE students (
    email VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    enrollment_number VARCHAR(10) NOT NULL,
    roll_number VARCHAR(10) NOT NULL
);

-- INSERT QUERIES 
INSERT INTO Authentications VALUES('test@gmail.com','123');
INSERT INTO students VALUES('test@gmail.com', 'test', 'DE20415', '20I4089');