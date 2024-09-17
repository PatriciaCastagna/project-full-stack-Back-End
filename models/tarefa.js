'use strict';
module.exports = (sequelize, DataTypes) => {
  const Tarefa = sequelize.define('Tarefa', {
    titulo: DataTypes.STRING,
    descricao: DataTypes.STRING,
    concluida: DataTypes.BOOLEAN,
    usuario_id: DataTypes.INTEGER
  }, {});
  
  Tarefa.associate = function(models) {
    Tarefa.belongsTo(models.Usuario, { foreignKey: 'usuario_id' });
  };
  
  return Tarefa;
};
