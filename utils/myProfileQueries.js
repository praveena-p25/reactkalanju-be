const APM = require("./apm");
const { db } = require("./db");

module.exports = {
  getResourceDetails: async (resourceId) => {
    const [resourceDetails] = await db.query(
      `SELECT resource.*,
            DATE_FORMAT(resource.dob, "%Y-%m-%d") as dob,
            (select json_arrayagg(json_object("name", r.name, "value", rm.manager_id)) from resource_reporting_manager as rm INNER JOIN resources r ON r.id = rm.manager_id 
            where rm.resource_id = resource.id AND rm.deleted_at IS null group by (rm.resource_id)) reporting_manager,
            (select role from roles as ro where ro.id = resource.role_id) role,
            (select json_arrayagg(json_object(
                'id',id, 'line_1', line_1, 'country', country, 'city', city, 'state', state, 'pincode', pincode
            )) from addresses as addr Where addr.id = resource.permanent_address_id) permanent_address,
            (select json_arrayagg(json_object(
                'id',id,'line_1', line_1, 'country', country, 'city', city, 'state', state, 'pincode', pincode
            )) from addresses as addr Where addr.id = resource.current_address_id) current_address
                FROM resources as resource WHERE resource.id = ? AND resource.deleted_at IS null`,
      [resourceId]
    );
    return resourceDetails;
  },

  getResourceSkills: async (resourceId) => {
    const [resourceSkills] = await db.query(
      `SELECT * FROM skills WHERE skills.resource_id = ? AND skills.deleted_at IS null`,
      [resourceId]
    );
    return resourceSkills;
  },

  getResourceCertifications: async (resourceId) => {
    const [resourceCertifications] = await db.query(
      `SELECT *, DATE_FORMAT(to_date, "%Y-%m-%d") as to_date, DATE_FORMAT(from_date, "%Y-%m-%d") as from_date FROM certifications WHERE certifications.resource_id = ? AND certifications.deleted_at IS null`,
      [resourceId]
    );
    return resourceCertifications;
  },

  saveExperience: async (
    { company_name, location, role, from_date, to_date, responsibilities },
    resource_id
  ) => {
    const [result] = await db.query(
      `INSERT INTO experiences (company_name, location, role, resource_id, from_date, to_date,responsibilities, created_at,updated_at) VALUES 
        (?, ?, ?, ?, ?, ?, ?, CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));`,
      [
        company_name,
        location,
        role,
        resource_id,
        from_date,
        to_date,
        responsibilities,
      ]
    );
    return result;
  },

  getResourceExperience: async ({ id }) => {
    const [result] = await db.query(
      `SELECT exper.*,DATE_FORMAT(exper.from_date, "%Y-%m-%d") as from_date,DATE_FORMAT(exper.to_date, "%Y-%m-%d") as to_date, 
        json_arrayagg(json_object(
            'id',doc.id,'name', doc.name, 'url',doc.url, 'documentable_id', doc.documentable_id, 'documentable_type', doc.documentable_type
        )) documents 
        FROM experiences as exper 
        LEFT JOIN
            documents as doc ON doc.documentable_id = exper.id AND doc.documentable_type = "Experience" AND doc.deleted_at IS null
        WHERE 
            exper.resource_id = ? AND exper.deleted_at IS null 
        GROUP BY (id)`,
      [id]
    );
    return result;
  },

  //get dob using resource_id
  getDobwithResourceId: async (id) => {
    const [result] = await db.query(
      `SELECT DATE_FORMAT(dob, "%Y-%m-%d") as dob FROM resources where id = ${id}`
    );
    return result[0];
  },

  updateExperience: async (
    {
      company_name,
      location,
      role,
      resource_id,
      from_date,
      to_date,
      responsibilities,
    },
    method,
    id
  ) => {
    const [result] = await db.query(`SELECT * FROM experiences WHERE id=?`, [
      id,
    ]);

    if (result.length === 0) {
      throw { message: "No records found" };
    }
    if (result[0].deleted_at !== null) {
      throw { message: "Experience already deleted" };
    }
    const [results] =
      result.length !== 0 &&
      (await db.query(
        `UPDATE experiences SET ${
          method === "DELETE"
            ? `deleted_at = CAST(NOW() AS DATETIME)`
            : `company_name = ?, location = ?, role = ?, resource_id = ?, from_date = ?, to_date = ?, responsibilities = ?, updated_at = CAST(NOW() AS DATETIME)`
        } WHERE id = ${id};`,
        [
          company_name,
          location,
          role,
          resource_id,
          from_date,
          to_date,
          responsibilities,
        ]
      ));

    return results.affectedRows;
  },

  getResourceBankAccounts: async (resourceId) => {
    const [result] = await db.query(
      `SELECT * FROM bank_accounts WHERE bank_accounts.accountable_id = ? AND bank_accounts.deleted_at IS null`,
      [resourceId]
    );
    const [pfResult] = await db.query(
      `SELECT * FROM pfs WHERE pfs.resource_id = ?`,
      [resourceId]
    );
    return { bankResult: result, pfResult };
  },

  getResourcefamily: async (resourceId) => {
    const [family] = await db.query(
      `SELECT *, DATE_FORMAT(dob, "%Y-%m-%d") dob FROM resource_families WHERE resource_families.resource_id = ? 
        AND resource_families.deleted_at IS null`,
      [resourceId]
    );
    return family;
  },

  getResourceDocuments: async (resourceId) => {
    const [resourcedocuments] = await db.query(
      `SELECT * FROM documents WHERE documents.documentable_id = ? AND documents.documentable_type = "Resource" AND documents.deleted_at IS null`,
      [resourceId]
    );
    return resourcedocuments;
  },

  getResourceProjects: async (id) => {
    const [result] = await db.query(
      `select c.nickname as company_name, pro.project_name,
      (select count((id)) from projectmembers where project_id = pro.id AND deleted_at IS null) members_count
      ,pro.started_on, pm.deleted_at, pm.status, pro.project_status , pro.deleted_at project_deleted_at
      from projects as pro 
      INNER JOIN projectmembers as pm ON pm.project_id = pro.id 
      INNER JOIN clients as c ON pro.client_id = c.id AND c.deleted_at IS null AND c.active = 1 
      where pm.resource_id = ?`,
      [id]
    );
    return result;
  },

  getResourceAssets: async (id) => {
    const [result] = await db.query(
      `select ar.id, ar.resource_id, DATE_FORMAT(ar.given_on, "%Y-%m-%d") as given_on, ar.returnable, ass.item_type, ass.model, ass.make, DATE_FORMAT(ar.returned_on, "%Y-%m-%d") as returned_on from assetresources as ar INNER JOIN assets as ass ON ar.asset_id = ass.id WHERE ar.resource_id = ?`,
      [id]
    );
    return result;
  },

  updateResources: async (
    {
      name,
      phone,
      gender,
      dob,
      personal_email,
      marital_status,
      blood_group,
      title,
      address,
    },
    id
  ) => {
    const [result] = await db.query(`SELECT * FROM resources WHERE id=?`, [id]);
    const method = "PUT";
    if (result.length === 0) {
      throw { message: "No records found" };
    }
    if (result[0].deleted_at !== null) {
      throw { message: "Resources already deleted" };
    }

    const [res] = await db.query(
      `SELECT phone FROM resources where id != ${id} AND phone = ?`,
      [phone]
    );
    if (res.length > 0) {
      throw { message: "Phone Number already exist" };
    }

    if (address.currentAddress.id && address.permanentAddress.id) {
      try {
        const [results] =
          result.length !== 0 &&
          (await db.query(
            `START TRANSACTION;
            UPDATE resources SET name = ?, phone = ?, gender = ?, dob = ?, personal_email = ?, marital_status = ?, blood_group = ?, title = ?, updated_at = CAST(NOW() AS DATETIME) WHERE resources.deleted_at IS null AND resources.id = ${id};
            UPDATE addresses SET ${
              method === "DELETE"
                ? `deleted_at = CAST(NOW() AS DATETIME)`
                : `line_1 = ?, city = ?, country = ?, state = ?, pincode = ?, updated_at = CAST(NOW() AS DATETIME)`
            } WHERE addresses.id = ${address.currentAddress.id};
            UPDATE addresses SET ${
              method === "DELETE"
                ? `deleted_at = CAST(NOW() AS DATETIME)`
                : `line_1 = ?, city = ?, country = ?, state = ?, pincode = ?,  updated_at = CAST(NOW() AS DATETIME)`
            } WHERE addresses.id = ${address.permanentAddress.id};
            COMMIT;`,
            [
              name,
              phone,
              gender,
              dob,
              personal_email,
              marital_status,
              blood_group,
              title,
              address.currentAddress.line_1,
              address.currentAddress.city,
              address.currentAddress.country,
              address.currentAddress.state,
              address.currentAddress.pin_code,
              address.permanentAddress.line_1,
              address.permanentAddress.city,
              address.permanentAddress.country,
              address.permanentAddress.state,
              address.permanentAddress.pin_code,
            ]
          ));
        return results;
      } catch (err) {
        APM.apm?.captureError(err);
        if (err.sqlState) {
          await db.query(`Rollback`);
        }
        throw { message: "Something went wrong" };
      }
    } else if (!address.currentAddress.id && !address.permanentAddress.id) {
      try {
        const [results] =
          result.length !== 0 &&
          (await db.query(
            `START TRANSACTION;
            UPDATE resources SET name = ?, phone = ?, gender = ?, dob = ?, personal_email = ?, marital_status = ?, blood_group = ?, title = ?, updated_at = CAST(NOW() AS DATETIME) WHERE resources.deleted_at IS null AND resources.id = ${id};
            INSERT INTO addresses (line_1, city, country, state, pincode, created_at, updated_at) VALUES (?,?,?,?,?,CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));
            UPDATE resources SET current_address_id = LAST_INSERT_ID() WHERE resources.id = ${id};
            INSERT INTO addresses (line_1, city, country, state, pincode, created_at, updated_at) VALUES (?,?,?,?,?,CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));
            UPDATE resources SET permanent_address_id = LAST_INSERT_ID() WHERE resources.id = ${id};
            COMMIT;`,
            [
              name,
              phone,
              gender,
              dob,
              personal_email,
              marital_status,
              blood_group,
              title,
              address.currentAddress.line_1,
              address.currentAddress.city,
              address.currentAddress.country,
              address.currentAddress.state,
              address.currentAddress.pin_code,
              address.permanentAddress.line_1,
              address.permanentAddress.city,
              address.permanentAddress.country,
              address.permanentAddress.state,
              address.permanentAddress.pin_code,
            ]
          ));
        return results;
      } catch (err) {
        APM.apm?.captureError(err);
        if (err.sqlState) {
          await db.query(`Rollback`);
        }
        throw { message: "Something went wrong" };
      }
    } else if (!address.currentAddress.id && address.permanentAddress.id) {
      try {
        const [results] =
          result.length !== 0 &&
          (await db.query(
            `START TRANSACTION;
            UPDATE resources SET name = ?, phone = ?, gender = ?, dob = ?, personal_email = ?, marital_status = ?, blood_group = ?, title = ?, updated_at = CAST(NOW() AS DATETIME) WHERE resources.deleted_at IS null AND resources.id = ${id};
            INSERT INTO addresses (line_1, city, country, state, pincode, created_at, updated_at) VALUES (?,?,?,?,?,CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));
            UPDATE resources SET current_address_id = LAST_INSERT_ID() WHERE resources.id = ${id};
            UPDATE addresses SET ${
              method === "DELETE"
                ? `deleted_at = CAST(NOW() AS DATETIME)`
                : `line_1 = ?, city = ?, country = ?, state = ?, pincode = ?, updated_at = CAST(NOW() AS DATETIME)`
            } WHERE addresses.id = ${address.permanentAddress.id};
            COMMIT;`,
            [
              name,
              phone,
              gender,
              dob,
              personal_email,
              marital_status,
              blood_group,
              title,
              address.currentAddress.line_1,
              address.currentAddress.city,
              address.currentAddress.country,
              address.currentAddress.state,
              address.currentAddress.pin_code,
              address.permanentAddress.line_1,
              address.permanentAddress.city,
              address.permanentAddress.country,
              address.permanentAddress.state,
              address.permanentAddress.pin_code,
            ]
          ));
        return results;
      } catch (err) {
        APM.apm?.captureError(err);
        if (err.sqlState) {
          await db.query(`Rollback`);
        }
        throw { message: "Something went wrong" };
      }
    } else if (address.currentAddress.id && !address.permanentAddress.id) {
      try {
        const [results] =
          result.length !== 0 &&
          (await db.query(
            `START TRANSACTION;
            UPDATE resources SET name = ?, phone = ?, gender = ?, dob = ?, personal_email = ?, marital_status = ?, blood_group = ?, title = ?, updated_at = CAST(NOW() AS DATETIME) WHERE resources.deleted_at IS null AND resources.id = ${id};
            UPDATE addresses SET ${
              method === "DELETE"
                ? `deleted_at = CAST(NOW() AS DATETIME)`
                : `line_1 = ?, city = ?, country = ?, state = ?, pincode = ?, updated_at = CAST(NOW() AS DATETIME)`
            } WHERE addresses.id = ${address.currentAddress.id};
            INSERT INTO addresses (line_1, city, country, state, pincode, created_at, updated_at) VALUES (?,?,?,?,?,CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));
            UPDATE resources SET permanent_address_id = LAST_INSERT_ID() WHERE resources.id = ${id};
            COMMIT;`,
            [
              name,
              phone,
              gender,
              dob,
              personal_email,
              marital_status,
              blood_group,
              title,
              address.currentAddress.line_1,
              address.currentAddress.city,
              address.currentAddress.country,
              address.currentAddress.state,
              address.currentAddress.pin_code,
              address.permanentAddress.line_1,
              address.permanentAddress.city,
              address.permanentAddress.country,
              address.permanentAddress.state,
              address.permanentAddress.pin_code,
            ]
          ));
        return results;
      } catch (err) {
        APM.apm?.captureError(err);
        if (err.sqlState) {
          await db.query(`Rollback`);
        }
        throw { message: "Something went wrong" };
      }
    }
  },

  updateSkill: async (
    {
      id,
      name,
      from_date,
      resource_id,
      status,
      trained,
      trained_by,
      trainer_rating,
    },
    method,
    skill_id
  ) => {
    const [result] = await db.query(`SELECT * FROM skills WHERE id=?`, [id]);
    if (result.length === 0) {
      throw { message: "No records found" };
    }
    if (result[0].deleted_at !== null) {
      throw { message: "Skill already deleted" };
    }
    const [results] =
      result.length !== 0 &&
      (await db.query(
        `UPDATE skills SET ${
          method === "DELETE"
            ? `deleted_at = CAST(NOW() AS DATETIME)`
            : `name = ?, resource_id = ?, trained = ?, trained_by = ?, trainer_rating = ?,from_date = ?, status=?, updated_at = CAST(NOW() AS DATETIME)`
        } WHERE skills.deleted_at IS null AND skills.id = ${id};`,
        [
          name,
          resource_id,
          trained,
          trained_by,
          trainer_rating,
          from_date,
          status,
        ]
      ));
    return results.affectedRows;
  },

  //FAMILY DETAILS
  saveFamilies: async (
    { name, phone_number, dob, resource_relation, gender },
    resource_id
  ) => {
    const [resources] = await db.query(
      `SELECT * from resources WHERE id = ? AND deleted_at IS null`,
      [resource_id]
    );

    if (resources[0].phone == phone_number) {
      throw { message: "Phone Number cannot be same as yours" };
    }
    const [result] = await db.query(
      `INSERT INTO resource_families (name, phone_number, dob, resource_id, resource_relation, gender, created_at,updated_at) VALUES (?,?,?,?,?, ?,CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));`,
      [name, phone_number, dob, resource_id, resource_relation, gender]
    );
    return result;
  },

  updateFamilies: async (
    { name, phone_number, dob, resource_id, resource_relation, gender },
    method,
    id
  ) => {
    if (method != "DELETE") {
      const [resources] = await db.query(
        `SELECT * from resources WHERE id = ? AND deleted_at IS null`,
        [resource_id]
      );
      if (resources[0].phone == phone_number) {
        throw {
          message: resource_relation + " Phone Number cannot be same as yours",
        };
      }
    }
    const [result] = await db.query(
      `SELECT * FROM resource_families WHERE id=?`,
      [id]
    );
    if (result.length === 0) {
      throw { message: "No records found" };
    }
    if (result[0].deleted_at !== null) {
      throw { message: "Person already deleted" };
    }
    const [results] =
      result.length !== 0 &&
      (await db.query(
        `UPDATE resource_families SET ${
          method === "DELETE"
            ? `deleted_at = CAST(NOW() AS DATETIME)`
            : `name = ?, phone_number = ?, dob = ?, resource_id = ?, resource_relation = ?, gender = ?, updated_at = CAST(NOW() AS DATETIME)`
        } WHERE resource_families.deleted_at IS null AND resource_families.id = ${id};`,
        [name, phone_number, dob, resource_id, resource_relation, gender]
      ));
    return results.affectedRows;
  },

  saveSkill: async (
    {
      name,
      status,
      trained,
      trained_by,
      from_date,
      trainer_rating,
      trainer_id,
    },
    resource_id
  ) => {
    const [result] = await db.query(
      `INSERT INTO skills (name, resource_id, trained, trained_by, trainer_rating, from_date, status, created_at, updated_at, trainer_id) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME),?);`,
      [
        name,
        resource_id,
        trained,
        trained_by,
        trainer_rating,
        from_date,
        status,
        trainer_id,
      ]
    );
    return result;
  },

  //CERTIFICATION
  saveCertification: async (
    { from_date, institution, program, to_date },
    resource_id
  ) => {
    const [result] = await db.query(
      `INSERT INTO certifications (institution, program, resource_id, from_date, to_date,created_at, updated_at) VALUES
        (?, ?, ?, ?, ?, CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));`,
      [institution, program, resource_id, from_date, to_date]
    );
    return result;
  },

  updateCertification: async (
    { from_date, institution, program, to_date, id },
    method,
    resources_id
  ) => {
    const [result] = await db.query(`SELECT * FROM certifications WHERE id=?`, [
      id,
    ]);
    if (result.length === 0) {
      throw { message: "No records found" };
    }
    if (result[0].deleted_at !== null) {
      throw { message: "Role already deleted" };
    }

    const [results] =
      result.length !== 0 &&
      (await db.query(
        `UPDATE certifications SET ${
          method === "DELETE"
            ? `deleted_at = CAST(NOW() AS DATETIME)`
            : `from_date = ?, institution = ?, program = ?,  to_date =?, updated_at = CAST(NOW() AS DATETIME)`
        } WHERE certifications.deleted_at IS NULL AND certifications.id = ${id} AND resource_id =${resources_id} ;`,
        [from_date, institution, program, to_date]
      ));

    return results.affectedRows;
  },

  getAllSkills: async () => {
    const [result] = await db.query(
      `SELECT id, name FROM master_data WHERE type_name = "skill"`
    );
    return result;
  },

  getAllResourceName: async () => {
    const [result] = await db.query(`SELECT name , id FROM resources`);
    return result;
  },

  updatePrimarySkills: async (skills, resource_id) => {
    await db.query(`UPDATE skills SET primary_skill=NULL WHERE resource_id=?`, [
      resource_id,
    ]);
    let updateCount = 0;
    for (let skill of skills) {
      const [updateResponse] = await db.query(
        `UPDATE skills SET primary_skill = 1 WHERE id=? AND resource_id=?`,
        [skill.value, resource_id]
      );
      if (updateResponse.changedRows) {
        updateCount += 1;
      }
    }
    if (updateCount !== skills.length) {
      throw { message: "Primary skills not updated properly", errorSts: true };
    }
  },

  //DOCUMENT
  saveDocument: async ({
    name,
    documentable_id,
    documentable_type,
    number,
    url,
  }) => {
    const [result] = await db.query(
      `INSERT INTO documents (name,documentable_id,documentable_type,number,url,created_at,updated_at) VALUES (?,?,?,?,?,CAST(NOW() AS DATETIME), CAST(NOW() AS DATETIME));`,
      [name, documentable_id, documentable_type, number, url]
    );
    return result;
  },

  updateDocument: async ({ name, number, url }, method, id) => {
    const [result] = await db.query(`SELECT * FROM documents WHERE id=?`, [id]);
    if (result.length === 0) {
      throw { message: "No records found" };
    }
    if (result[0].deleted_at !== null) {
      throw { message: "Document already deleted" };
    }
    const [results] =
      result.length !== 0 &&
      (await db.query(
        `UPDATE documents SET ${
          method === "DELETE"
            ? `deleted_at = CAST(NOW() AS DATETIME)`
            : `name = ?,number = ?,url = ?, updated_at = CAST(NOW() AS DATETIME)`
        } WHERE documents.deleted_at IS null AND documents.id = ${id};`,
        [name, number, url]
      ));
    return results.affectedRows;
  },
};
