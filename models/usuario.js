'use strict';
module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    nome: DataTypes.STRING,
    cpf: DataTypes.STRING,
    email: DataTypes.STRING,
    senha: DataTypes.STRING
  }, {});
  
  Usuario.associate = function(models) {
    Usuario.hasMany(models.Tarefa, { foreignKey: 'usuario_id' });
  };
  
  return Usuario;
};
