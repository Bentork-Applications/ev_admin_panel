import React from "react";
import { useMargin } from "recharts";

export default function SearchBar() {
  const styles = {
    container: {
      width: "1140px",
    //   display: "flex",
     
     
    },
    section: {
      display: "flex",
      alignItems: "center",
      backgroundColor: "#f8f8f8",
      padding: "8px",
      borderRadius: "30px",
      width: "1140px",
      maxWidth: "1140px",
      gap: "60px",
    },
    input: {
      flex: 1,
      padding: "10px 15px",
      border: "none",
      outline: "none",
      borderRadius: "30px",
      fontSize: "15px",
      backgroundColor: "#f8f8f8",
    },
    select: {
      border: "solid #f1f1f1",
      outline: "none",
      backgroundColor: "#f8f8f8",
      fontSize: "15px",
      cursor: "pointer",
      color: "#0e0101ff",
      padding: "10px 20px",

    borderRadius: "20px",
  
    width:"150px"


      
    },
    button: {
      backgroundColor: "#000",
      color: "#fff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "25px",
      cursor: "pointer",
      fontSize: "15px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <input
          type="text"
          placeholder="Search"
          style={styles.input}
        />
        <select style={styles.select}>
          <option>All </option>
          <option>Online</option>
          <option>Offline</option>
         <option>Type2</option>
          <option>CSS2</option>
        </select>
        <button style={styles.button}>Export</button>
      </div>
    </div>
  );
}




