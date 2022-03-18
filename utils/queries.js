const { db } = require("./db");

module.exports = {
  getRolesAndCount: async () => {
    const [result] = await db.query(
      `SELECT
                ro.id AS id,
                ro.role AS role,
                (SELECT COUNT(id) FROM resources where resources.role_id = ro.id and resources.deleted_at IS  null) AS total_count,
                (SELECT COUNT(id) FROM resources where resources.role_id = ro.id AND resources.active = 1 and resources.deleted_at IS  null) as active, 
                (SELECT COUNT(id) FROM resources where resources.role_id = ro.id and resources.active = 0 and resources.deleted_at IS  null) as inactive
            FROM roles as ro
            WHERE ro.deleted_at IS NULL;`
    );

    return result;
  },

  getAccesses: async () => {
    const [result] = await db.query(
      `SELECT ac.group, JSON_ARRAYAGG(JSON_OBJECT("name",ac.name,"id",ac.id, "status",1)) 
            AS 'accesses' FROM accesses AS ac WHERE deleted_at IS NULL GROUP BY ac.group;`
    );

    const data = result.filter((res) => res.group !== "User");

    return data;
  },

  getResourcesForRoles: async (
    role_id,
    searchQuery,
    offset,
    page_size,
    active
  ) => {
    searchQuery = searchQuery || "";
    role_id = role_id === "" ? 0 : role_id;
    active = active === "" ? 2 : active;

    const [resourceRows] = await db.query(
      `SELECT COUNT(*) AS count
            FROM resources AS re INNER JOIN roles AS ro ON re.role_id = ro.id
            WHERE re.deleted_at IS NULL AND (re.active=? OR 2=?) AND (re.role_id=? OR 0=?) 
            AND LOWER(re.name) LIKE ?`,
      [active, active, role_id, role_id, `%${searchQuery}%`]
    );

    const [result] = await db.query(
      `SELECT re.id, re.name, re.job_type, re.role_id, re.active, ro.role,
                CASE WHEN 
                        re.profile_photo LIKE "https://lh3.googleusercontent.com%" THEN re.profile_photo
                        ELSE NULL END 
                    AS profile_photo
            FROM resources AS re INNER JOIN roles AS ro ON re.role_id = ro.id
            WHERE re.deleted_at IS NULL AND (re.active=? OR 2=?) AND (re.role_id=? OR 0=?) 
            AND LOWER(re.name) LIKE ? LIMIT ?, ?`,
      [
        active,
        active,
        role_id,
        role_id,
        `%${searchQuery}%`,
        offset,
        parseInt(page_size),
      ]
    );

    return { result, resourcesCount: resourceRows[0].count };
  },

  updateResourcesRoleAndLevel: async (employee_id, role_id) => {
    const [result] = await db.query(
      `UPDATE resources SET role_id = ? WHERE id=?`,
      [role_id, employee_id]
    );

    return result;
  },

  deleteRoleWithId: async (role_id) => {
    const [result] = await db.query(`SELECT * FROM roles WHERE id=?`, [
      role_id,
    ]);

    if (result.length === 0) {
      throw { message: "no records found" };
    }

    if (result[0].deleted_at !== null) {
      throw { message: "role already deleted" };
    }

    await db.query(
      `UPDATE 
                role_accesses AS ra
                SET ra.deleted_at = CAST(NOW() AS DATETIME)
            WHERE ra.deleted_at IS NULL AND ra.role_id = ?`,
      [role_id]
    );

    await db.query(
      `UPDATE roles SET deleted_at = CAST(NOW() AS DATETIME) WHERE id=?`,
      [role_id]
    );

    return result;
  },

  createRoleWithAcesses: async (role_name, accesses) => {
    const queryResult = [];

    let [rows] = await db.query(
      `SELECT * FROM roles WHERE role=? AND deleted_at IS NULL`,
      [role_name]
    );

    if (rows.length) {
      throw { message: `${role_name} already exists, try another name` };
    }

    let [result] = await db.query(
      `INSERT INTO roles (role, created_at, updated_at, status) 
            VALUES (?,CAST(NOW() AS DATETIME),CAST(NOW() AS DATETIME),1);`,
      [role_name]
    );

    if (result.affectedRows === 0) {
      throw { message: "Role was not created, please try again" };
    }

    const role_id = result.insertId;
    queryResult.push(result);

    const insertQueryForRoleAccess = `INSERT INTO role_accesses (role_id,access_id, created_at,updated_at) VALUES (?,?,CAST(NOW() AS DATETIME),CAST(NOW() AS DATETIME));`;

    for (let access of accesses) {
      result = await db.query(insertQueryForRoleAccess, [role_id, access]);
      queryResult.push(result);
    }

    return queryResult;
  },

  getAccesForRole: async (role_id) => {
    const [rows] = await db.query(
      `
                        SELECT ra.access_id, ro.role FROM roles AS ro 
                        LEFT JOIN role_accesses AS ra ON ra.role_id = ro.id 
                        AND ra.deleted_at IS null WHERE ro.id=?;`,
      [role_id]
    );

    let result = {
      role: "",
      availAccess: [],
    };
    rows.map((row) => {
      result.role = row.role;
      row.access_id ? result.availAccess.push(row.access_id) : null;
    });
    return result;
  },

  editRoleAccess: async (role_id, roleName, accesses) => {
    await db.query(
      `UPDATE role_accesses SET deleted_at = CAST(NOW() AS DATETIME) WHERE role_id=?`,
      [role_id]
    );
    await db.query(
      `UPDATE roles SET role = ?, updated_at = CAST(NOW() AS DATETIME) WHERE id=?`,
      [roleName, role_id]
    );

    for (let access of accesses) {
      await db.query(
        `INSERT INTO role_accesses (role_id, access_id, created_at, updated_at) 
                VALUES (?, ?, CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));`,
        [role_id, access]
      );
    }
  },

  getResources: async () => {
    const [result] = await db.query(
      `SELECT 
            re.id, re.name, re.level, re.job_type, re.role_id, ro.role, re.active AS status, 
            CASE WHEN 
                    re.profile_photo LIKE "https://lh3.googleusercontent.com%" THEN re.profile_photo
                    ELSE NULL END 
                AS profile_photo
            FROM resources AS re INNER JOIN roles AS ro ON re.role_id = ro.id
            WHERE re.deleted_at IS NULL;`
    );
    return result;
  },
};
