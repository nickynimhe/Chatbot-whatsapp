DELETE FROM mensajes 
WHERE texto LIKE '%location%' 
   OR texto LIKE '%latitude%' 
   OR texto LIKE '%longitude%';
   